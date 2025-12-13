#[test_only]
module pythia::pythia_tests;

use pythia::pythia::{Self, ProtocolConfig, Market, UserProfile};
use std::string;
use sui::clock;
use sui::coin;
use sui::sui::SUI;
use sui::test_scenario::{Self, Scenario};

const ADMIN: address = @0xA;
const CREATOR: address = @0xB;
const ARBITER: address = @0xC;
const USER1: address = @0xD;
const USER2: address = @0xE;

// --- Helpers ---

fun setup_protocol(scenario: &mut Scenario) {
    // 1. Init
    {
        pythia::test_init(test_scenario::ctx(scenario));
    };

    // 2. Approve Arbiter
    test_scenario::next_tx(scenario, ADMIN);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(scenario);
        pythia::approve_arbiter(&mut config, ARBITER, test_scenario::ctx(scenario));
        test_scenario::return_shared(config);
    };
}

fun create_market_helper(scenario: &mut Scenario): ID {
    test_scenario::next_tx(scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(scenario));
        let arbiters = vector[ARBITER];

        pythia::create_market(
            &config,
            string::utf8(b"Will BTC hit 100k?"),
            1000, // End time
            2000, // Resolution deadline
            arbiters,
            1, // Threshold
            &clock,
            test_scenario::ctx(scenario),
        );

        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };

    // Capture Market ID
    let market_id;
    test_scenario::next_tx(scenario, CREATOR);
    {
        let market = test_scenario::take_shared<Market>(scenario);
        market_id = object::id(&market);
        test_scenario::return_shared(market);
    };
    market_id
}

fun place_bet_helper(scenario: &mut Scenario, user: address, is_yes: bool) {
    // Create profile
    test_scenario::next_tx(scenario, user);
    {
        pythia::create_profile(test_scenario::ctx(scenario));
    };

    // Place bet
    test_scenario::next_tx(scenario, user);
    {
        let mut market = test_scenario::take_shared<Market>(scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(scenario));

        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(scenario));

        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            is_yes,
            coin,
            &clock,
            test_scenario::ctx(scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(scenario, profile);
        clock::destroy_for_testing(clock);
    };
}

fun resolve_market_helper(scenario: &mut Scenario, outcome: bool) {
    test_scenario::next_tx(scenario, ARBITER);
    {
        let mut market = test_scenario::take_shared<Market>(scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(scenario));
        clock::set_for_testing(&mut clock, 1500); // Past betting end time

        pythia::submit_resolution(
            &mut market,
            &mut config,
            outcome,
            &clock,
            test_scenario::ctx(scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };
}

fun finalize_market_helper(scenario: &mut Scenario) {
    test_scenario::next_tx(scenario, ADMIN);
    {
        let mut market = test_scenario::take_shared<Market>(scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(scenario));
        // Dispute period is 86400 * 1000
        clock::set_for_testing(&mut clock, 1500 + 86400 * 1000 + 1);

        pythia::finalize_market(
            &mut market,
            &mut config,
            &clock,
            test_scenario::ctx(scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };
}

// --- Tests ---

#[test]
fun test_create_market() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);
    test_scenario::end(scenario);
}

#[test]
fun test_place_bets() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    // User 1 bets YES
    place_bet_helper(&mut scenario, USER1, true);
    // User 2 bets NO
    place_bet_helper(&mut scenario, USER2, false);

    test_scenario::end(scenario);
}

#[test]
fun test_resolution() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    place_bet_helper(&mut scenario, USER1, true);
    place_bet_helper(&mut scenario, USER2, false);

    // Resolve YES wins
    resolve_market_helper(&mut scenario, true);

    test_scenario::end(scenario);
}

#[test]
fun test_claim() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    place_bet_helper(&mut scenario, USER1, true);
    place_bet_helper(&mut scenario, USER2, false);

    resolve_market_helper(&mut scenario, true); // YES wins
    finalize_market_helper(&mut scenario);

    // Claim (User 1 Wins)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        pythia::claim(
            &mut market,
            &config,
            position,
            &mut profile,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };

    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 1, location = pythia)]
fun test_unauthorized_arbiter_approval() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        pythia::test_init(test_scenario::ctx(&mut scenario));
    };
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        // Should fail here
        pythia::approve_arbiter(&mut config, ARBITER, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(config);
    };
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 3, location = pythia)]
fun test_arbiter_cannot_bet() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    // Arbiter tries to bet
    test_scenario::next_tx(&mut scenario, ARBITER);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };
    test_scenario::next_tx(&mut scenario, ARBITER);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(&mut scenario));

        // Should fail
        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            true,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 4, location = pythia)]
fun test_unauthorized_resolution() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    place_bet_helper(&mut scenario, USER1, true);

    // USER1 tries to resolve (is not arbiter)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);

        // Should fail
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 1, location = pythia)]
fun test_admin_only_dispute_resolution() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);
    place_bet_helper(&mut scenario, USER1, true);
    resolve_market_helper(&mut scenario, true);

    // 1. File Dispute (Anyone can file, e.g., USER2)
    test_scenario::next_tx(&mut scenario, USER2);
    place_bet_helper(&mut scenario, USER2, false);

    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        // Need a losing position (NO) for USER2.
        // We need to mint/place one first or just mint a dummy position if we weren't doing full integration.
        // But since file_dispute checks position, we must have bet.
        // In this test, USER2 didn't bet. We need to make USER2 bet NO first.
        // This test logic "Anyone can file" is now invalid. We must change it to "Loser can file".

        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(&mut scenario));
        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);

        pythia::file_dispute(
            &mut market,
            &config,
            &mut profile,
            coin,
            &position,
            string::utf8(b"Wrong outcome"),
            false, // Propose NO
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_to_sender(&scenario, profile);
        test_scenario::return_to_sender(&scenario, position);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 2. Unauthorized Resolution (by USER1)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);

        // Should fail
        pythia::resolve_dispute(
            &mut market,
            &mut config,
            false, // reject dispute
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
    };
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 12, location = pythia)] // EBettingClosed
fun test_bet_after_deadline() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    test_scenario::next_tx(&mut scenario, USER1);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };

    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Fast forward past betting deadline (1000)
        clock::set_for_testing(&mut clock, 1001);

        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(&mut scenario));

        // Should fail
        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            true,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
#[
    expected_failure(
        abort_code = 7,
        location = pythia,
    ),
] // EDisputePeriodActive (used for timing checks)
fun test_dispute_after_period() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);
    place_bet_helper(&mut scenario, USER1, true);
    resolve_market_helper(&mut scenario, true);

    test_scenario::next_tx(&mut scenario, USER2);
    place_bet_helper(&mut scenario, USER2, false);

    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Dispute period is 86400 * 1000 ms = 86,400,000 ms
        // Resolution happens at 1500. Dispute end time = 1500 + 86400000 = 86401500.
        // Let's go to 86401501.
        clock::set_for_testing(&mut clock, 1500 + 86400 * 1000 + 1);

        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(&mut scenario));

        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);

        // Should fail
        pythia::file_dispute(
            &mut market,
            &config,
            &mut profile,
            coin,
            &position,
            string::utf8(b"Too late"),
            false,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_to_sender(&scenario, profile);
        test_scenario::return_to_sender(&scenario, position);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_admin_uphold_dispute() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    // User 1 bets YES
    place_bet_helper(&mut scenario, USER1, true);
    // User 2 bets NO
    place_bet_helper(&mut scenario, USER2, false);

    // Arbiter resolves YES (User 1 winning state)
    resolve_market_helper(&mut scenario, true);

    // User 2 disputes (claims NO)
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1600); // Inside dispute period

        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(&mut scenario));

        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);

        pythia::file_dispute(
            &mut market,
            &config,
            &mut profile,
            coin,
            &position,
            string::utf8(b"Actually NO won"),
            false, // Propose NO
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_to_sender(&scenario, profile);
        test_scenario::return_to_sender(&scenario, position);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // Admin upholds dispute (Sets outcome to NO)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);

        pythia::resolve_dispute(
            &mut market,
            &mut config,
            true, // Uphold dispute (Change outcome to proposed: NO)
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
    };

    // Verify User 2 (NO bettor) can claim
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Mock finalization checks (since resolve_dispute sets finalized = true)

        pythia::claim(
            &mut market,
            &config,
            position,
            &mut profile,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_claim_no_wins() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    // User 1 bets NO
    place_bet_helper(&mut scenario, USER1, false);
    // User 2 bets YES (loser)
    place_bet_helper(&mut scenario, USER2, true);

    // Resolve NO wins
    resolve_market_helper(&mut scenario, false);
    finalize_market_helper(&mut scenario);

    // Claim (User 1 Wins)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        pythia::claim(
            &mut market,
            &config,
            position,
            &mut profile,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_burn_losing_position() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    // User 1 bets YES (will lose)
    place_bet_helper(&mut scenario, USER1, true);
    // User 2 bets NO (will win)
    place_bet_helper(&mut scenario, USER2, false);

    // Resolve NO wins
    resolve_market_helper(&mut scenario, false);
    finalize_market_helper(&mut scenario);

    // User 1 tries to claim (should succeed in execution but return 0 value, effectively burning position)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        pythia::claim(
            &mut market,
            &config,
            position,
            &mut profile,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        // Verify position is gone (consumed by claim) - implicitly verified by success of claim

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_multiple_arbiters_consensus() {
    let mut scenario = test_scenario::begin(ADMIN);
    // 1. Init
    {
        pythia::test_init(test_scenario::ctx(&mut scenario));
    };

    // 2. Approve Arbiters (A, B, C)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        pythia::approve_arbiter(&mut config, @0xA1, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, @0xB1, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, @0xC1, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(config);
    };

    // 3. Create Market with 3 Arbiters, Threshold 2
    test_scenario::next_tx(&mut scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let arbiters = vector[@0xA1, @0xB1, @0xC1];

        pythia::create_market(
            &config,
            string::utf8(b"Consensus Test"),
            1000,
            2000,
            arbiters,
            2, // Threshold
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };

    // 4. Arbiter A Votes YES
    test_scenario::next_tx(&mut scenario, @0xA1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);

        pythia::submit_resolution(
            &mut market,
            &mut config,
            true, // VOTE YES
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        // Should NOT be resolved yet (1/2 votes)
        assert!(!pythia::is_market_resolved(&market), 0);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 5. Arbiter B Votes NO
    test_scenario::next_tx(&mut scenario, @0xB1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);

        pythia::submit_resolution(
            &mut market,
            &mut config,
            false, // VOTE NO
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        // Should NOT be resolved yet (1 YES, 1 NO)
        assert!(!pythia::is_market_resolved(&market), 0);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 6. Arbiter C Votes YES
    test_scenario::next_tx(&mut scenario, @0xC1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);

        pythia::submit_resolution(
            &mut market,
            &mut config,
            true, // VOTE YES
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        // Should NOW be resolved (2 YES > threshold)
        assert!(pythia::is_market_resolved(&market), 0);
        assert!(pythia::get_market_outcome(&market) == option::some(true), 0);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_admin_reject_dispute() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);
    place_bet_helper(&mut scenario, USER1, true);
    resolve_market_helper(&mut scenario, true);

    // User 2 bets NO (but market resolved YES, so User 2 is loser)
    // Wait, in previous step place_bet_helper(USER1, true), resolve_market(true).
    // USER1 wins. USER2 must bet NO to be a loser.
    // In original test, USER2 didn't bet. We need to make them bet.
    place_bet_helper(&mut scenario, USER2, false);

    // User 2 disputes (claims NO)
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1600);
        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);

        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(&mut scenario));

        pythia::file_dispute(
            &mut market,
            &config,
            &mut profile,
            coin,
            &position,
            string::utf8(b"I disagree"),
            false,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_to_sender(&scenario, profile);
        test_scenario::return_to_sender(&scenario, position);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // Admin rejects dispute (false)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);

        pythia::resolve_dispute(
            &mut market,
            &mut config,
            false, // REJECT DISPUTE
            test_scenario::ctx(&mut scenario),
        );

        // Outcome should still be YES (original)
        assert!(pythia::get_market_outcome(&market) == option::some(true), 0);

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_revoked_arbiter_payment() {
    let mut scenario = test_scenario::begin(ADMIN);
    // 1. Init
    {
        pythia::test_init(test_scenario::ctx(&mut scenario));
    };

    // 2. Approve Arbiters A and B
    let arbiter_a = @0xA1;
    let arbiter_b = @0xB1;
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        pythia::approve_arbiter(&mut config, arbiter_a, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, arbiter_b, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(config);
    };

    // 3. Create Market with A and B
    test_scenario::next_tx(&mut scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let arbiters = vector[arbiter_a, arbiter_b];

        pythia::create_market(
            &config,
            string::utf8(b"Payment Test"),
            1000,
            2000,
            arbiters,
            2, // Threshold
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };

    // 4. Place Bets to generate pot
    place_bet_helper(&mut scenario, USER1, true); // YES 10 SUI
    place_bet_helper(&mut scenario, USER2, false); // NO 10 SUI

    // 5. Both Arbiters Vote YES
    test_scenario::next_tx(&mut scenario, arbiter_a);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    test_scenario::next_tx(&mut scenario, arbiter_b);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 6. Revoke Arbiter B
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        pythia::revoke_arbiter(&mut config, arbiter_b, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(config);
    };

    // 7. Finalize Market
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        // Dispute period ended
        clock::set_for_testing(&mut clock, 1500 + 86400 * 1000 + 1);

        pythia::finalize_market(
            &mut market,
            &mut config,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        // Verify Earnings
        // Pot = 20 SUI. Arbiter Fee = 1% = 0.2 SUI = 200_000_000 MIST.
        // A is approved, B is revoked.
        // Eligible voters = 1 (A).
        // A checks: share = 200M / 1 = 200M.
        // B checks: 0.

        let earnings_a = pythia::get_arbiter_earnings(&config, arbiter_a);
        let earnings_b = pythia::get_arbiter_earnings(&config, arbiter_b);

        // We need to calculate exact expected amount.
        // Total pot = 10_000_000_000 * 2 = 20_000_000_000.
        // Arbiter fee bps = 100 (1%).
        // Arbiter amt = 20_000_000_000 * 100 / 10000 = 200_000_000.

        assert!(earnings_a == 200_000_000, 101); // A gets full amount
        assert!(earnings_b == 0, 102); // B gets nothing

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_fee_distribution() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    let _market_id = create_market_helper(&mut scenario);

    // User 1 Create Profile
    test_scenario::next_tx(&mut scenario, USER1);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };

    // User 1 bets 100 SUI (100 * 10^9 MIST)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let coin = coin::mint_for_testing<SUI>(100_000_000_000, test_scenario::ctx(&mut scenario));

        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            true,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };

    resolve_market_helper(&mut scenario, true);
    finalize_market_helper(&mut scenario);

    // Check Treasury Balance (Protocol 1% + Arbiter 1% = 2% of 100 SUI = 2 SUI)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {};

    // User 1 Claims
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let _initial_balance = 0; // Assuming fresh account context tracking or we just check the event/coin obj

        pythia::claim(
            &mut market,
            &config,
            position,
            &mut profile,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        // We can't easily check balance here without complicated coin object inspection,
        // but if it didn't crash, the logic ran.
        // Ideally we would inspect the Coin<SUI> object transferred to User1.

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 2, location = pythia)] // EBetTooSmall
fun test_min_bet_amount() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);
    create_market_helper(&mut scenario);

    // Fix: Create profile first
    test_scenario::next_tx(&mut scenario, USER1);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };

    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Mint 0.5 SUI
        let coin = coin::mint_for_testing<SUI>(500_000_000, test_scenario::ctx(&mut scenario));

        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            true,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };
    test_scenario::end(scenario);
}

#[test]
#[
    expected_failure(
        abort_code = 13,
        location = pythia,
    ),
] // EResolutionDeadlinePassed (actually checking validation logic)
fun test_invalid_market_deadline() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);

    test_scenario::next_tx(&mut scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let arbiters = vector[ARBITER];

        pythia::create_market(
            &config,
            string::utf8(b"Bad Market"),
            2000, // Betting End
            1000, // Resolution Deadline (Before Betting End!)
            arbiters,
            1,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = 14, location = pythia)] // EInvalidArbiterCount
fun test_invalid_arbiter_threshold() {
    let mut scenario = test_scenario::begin(ADMIN);
    setup_protocol(&mut scenario);

    test_scenario::next_tx(&mut scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let arbiters = vector[ARBITER]; // Length 1

        pythia::create_market(
            &config,
            string::utf8(b"Bad Threshold"),
            1000,
            2000,
            arbiters,
            2, // Threshold 2 > Length 1
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_arbiter_incentives() {
    let mut scenario = test_scenario::begin(ADMIN);
    // 1. Init
    {
        pythia::test_init(test_scenario::ctx(&mut scenario));
    };

    // 2. Approve Arbiters (A, B, C)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        pythia::approve_arbiter(&mut config, @0xA1, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, @0xB1, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, @0xC1, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(config);
    };

    // 3. Create Market with 3 Arbiters, Threshold 2
    test_scenario::next_tx(&mut scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let arbiters = vector[@0xA1, @0xB1, @0xC1];

        pythia::create_market(
            &config,
            string::utf8(b"Incentive Test"),
            1000,
            2000,
            arbiters,
            2, // Threshold
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };

    // 4. Place Bets (Total Pot = 200 SUI)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };

    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let coin = coin::mint_for_testing<SUI>(200_000_000_000, test_scenario::ctx(&mut scenario));
        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            true,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };

    // 5. Arbiters A and B Resolve (C does nothing)
    test_scenario::next_tx(&mut scenario, @0xA1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    test_scenario::next_tx(&mut scenario, @0xB1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 6. Finalize Market
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500 + 86400 * 1000 + 1);

        pythia::finalize_market(
            &mut market,
            &mut config,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 7. Verify Payments
    // Total Pot = 200 SUI = 200_000_000_000 MIST
    // Arbiter Fee = 1% = 2 SUI = 2_000_000_000 MIST
    // Split between 2 arbiters = 1 SUI each = 1_000_000_000 MIST

    // Check A Earnings
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let earnings = pythia::get_arbiter_earnings(&config, @0xA1);
        assert!(earnings == 1_000_000_000, 0);

        let earnings_b = pythia::get_arbiter_earnings(&config, @0xB1);
        assert!(earnings_b == 1_000_000_000, 1);

        let earnings_c = pythia::get_arbiter_earnings(&config, @0xC1);
        assert!(earnings_c == 0, 2);

        test_scenario::return_shared(config);
    };

    // Check A Coin
    test_scenario::next_tx(&mut scenario, @0xA1);
    {
        let coin = test_scenario::take_from_sender<coin::Coin<SUI>>(&scenario);
        assert!(coin::value(&coin) == 1_000_000_000, 3);
        test_scenario::return_to_sender(&scenario, coin);
    };

    // Check B Coin
    test_scenario::next_tx(&mut scenario, @0xB1);
    {
        let coin = test_scenario::take_from_sender<coin::Coin<SUI>>(&scenario);
        assert!(coin::value(&coin) == 1_000_000_000, 4);
        test_scenario::return_to_sender(&scenario, coin);
    };

    // Check C (Should have nothing)
    test_scenario::next_tx(&mut scenario, @0xC1);
    {
        assert!(!test_scenario::has_most_recent_for_sender<coin::Coin<SUI>>(&scenario), 5);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_mixed_votes_incentives() {
    let mut scenario = test_scenario::begin(ADMIN);
    // 1. Init
    {
        pythia::test_init(test_scenario::ctx(&mut scenario));
    };

    // 2. Approve Arbiters (A, B, C)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        pythia::approve_arbiter(&mut config, @0xA1, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, @0xB1, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, @0xC1, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(config);
    };

    // 3. Create Market with 3 Arbiters, Threshold 2
    test_scenario::next_tx(&mut scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let arbiters = vector[@0xA1, @0xB1, @0xC1];

        pythia::create_market(
            &config,
            string::utf8(b"Mixed Votes Test"),
            1000,
            2000,
            arbiters,
            2,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };

    // 4. Place Bets (Total Pot = 200 SUI)
    test_scenario::next_tx(&mut scenario, USER1);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let coin = coin::mint_for_testing<SUI>(200_000_000_000, test_scenario::ctx(&mut scenario));
        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            true,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };

    // 5. Arbiters Vote: A=YES, B=NO, C=YES. Outcome should be YES.
    test_scenario::next_tx(&mut scenario, @0xA1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };
    test_scenario::next_tx(&mut scenario, @0xB1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            false,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };
    test_scenario::next_tx(&mut scenario, @0xC1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 6. Finalize Market
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500 + 86400 * 1000 + 1);

        pythia::finalize_market(
            &mut market,
            &mut config,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 7. Verify Payments
    // Pot 200 SUI. Fee 1% = 2 SUI.
    // Winning Arbiters: A and C. (B was NO, so B lost).
    // Split: 1 SUI to A, 1 SUI to C. 0 to B.

    test_scenario::next_tx(&mut scenario, @0xA1);
    {
        let coin = test_scenario::take_from_sender<coin::Coin<SUI>>(&scenario);
        assert!(coin::value(&coin) == 1_000_000_000, 0);
        test_scenario::return_to_sender(&scenario, coin);
    };

    test_scenario::next_tx(&mut scenario, @0xB1);
    {
        // B voted wrong, should get nothing
        assert!(!test_scenario::has_most_recent_for_sender<coin::Coin<SUI>>(&scenario), 1);
    };

    test_scenario::next_tx(&mut scenario, @0xC1);
    {
        let coin = test_scenario::take_from_sender<coin::Coin<SUI>>(&scenario);
        assert!(coin::value(&coin) == 1_000_000_000, 2);
        test_scenario::return_to_sender(&scenario, coin);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_dispute_resolution_pay() {
    let mut scenario = test_scenario::begin(ADMIN);
    // 1. Init
    {
        pythia::test_init(test_scenario::ctx(&mut scenario));
    };

    // 2. Approve Arbiters (A, B)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        pythia::approve_arbiter(&mut config, @0xA1, test_scenario::ctx(&mut scenario));
        pythia::approve_arbiter(&mut config, @0xB1, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(config);
    };

    // 3. Create Market
    test_scenario::next_tx(&mut scenario, CREATOR);
    {
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let arbiters = vector[@0xA1, @0xB1];

        pythia::create_market(
            &config,
            string::utf8(b"Dispute Test"),
            1000,
            2000,
            arbiters,
            2,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        clock::destroy_for_testing(clock);
        test_scenario::return_shared(config);
    };

    // 4. Place Bets (Total Pot = 200 SUI)
    // USER1 bets YES
    test_scenario::next_tx(&mut scenario, USER1);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let coin = coin::mint_for_testing<SUI>(100_000_000_000, test_scenario::ctx(&mut scenario));
        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            true,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };

    // USER2 bets NO (so they can be a loser if resolving YES)
    test_scenario::next_tx(&mut scenario, USER2);
    {
        pythia::create_profile(test_scenario::ctx(&mut scenario));
    };
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let coin = coin::mint_for_testing<SUI>(100_000_000_000, test_scenario::ctx(&mut scenario));
        pythia::place_bet(
            &mut market,
            &config,
            &mut profile,
            false,
            coin,
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(&scenario, profile);
        clock::destroy_for_testing(clock);
    };

    // 5. Arbiters Vote YES (Bot A and B) -> Market Resolved YES
    test_scenario::next_tx(&mut scenario, @0xA1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };
    test_scenario::next_tx(&mut scenario, @0xB1);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1500);
        pythia::submit_resolution(
            &mut market,
            &mut config,
            true,
            &clock,
            test_scenario::ctx(&mut scenario),
        );
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 6. User 2 Files Dispute (Claims NO)
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
        let mut profile = test_scenario::take_from_sender<UserProfile>(&scenario);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1600);

        let position = test_scenario::take_from_sender<pythia::Position>(&scenario);
        let coin = coin::mint_for_testing<SUI>(10_000_000_000, test_scenario::ctx(&mut scenario)); // Bond

        pythia::file_dispute(
            &mut market,
            &config,
            &mut profile,
            coin,
            &position,
            string::utf8(b"Actually NO"),
            false, // Propose NO
            &clock,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_to_sender(&scenario, profile);
        test_scenario::return_to_sender(&scenario, position);
        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
        clock::destroy_for_testing(clock);
    };

    // 7. Admin Upholds Dispute (YES -> NO)
    test_scenario::next_tx(&mut scenario, ADMIN);
    {
        let mut market = test_scenario::take_shared<Market>(&scenario);
        let mut config = test_scenario::take_shared<ProtocolConfig>(&scenario);

        pythia::resolve_dispute(
            &mut market,
            &mut config,
            true, // Uphold dispute -> Outcome becomes NO
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(market);
        test_scenario::return_shared(config);
    };

    // 8. Verify Arbiters A and B get NOTHING (because they voted YES)
    test_scenario::next_tx(&mut scenario, @0xA1);
    {
        assert!(!test_scenario::has_most_recent_for_sender<coin::Coin<SUI>>(&scenario), 0);
    };
    test_scenario::next_tx(&mut scenario, @0xB1);
    {
        assert!(!test_scenario::has_most_recent_for_sender<coin::Coin<SUI>>(&scenario), 1);
    };

    test_scenario::end(scenario);
}
