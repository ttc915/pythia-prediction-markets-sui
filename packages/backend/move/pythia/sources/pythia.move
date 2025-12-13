module pythia::pythia;

use std::string::{Self, String};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::display;
use sui::event;
use sui::package;
use sui::sui::SUI;
use sui::vec_map::{Self, VecMap};
use sui::vec_set::{Self, VecSet};

// === Constants ===

const CURRENT_VERSION: u64 = 1;

// === Errors ===

const EWrongVersion: u64 = 0;
const ENotAdmin: u64 = 1;
const EBetTooSmall: u64 = 2;
const EArbiterCannotBet: u64 = 3;
const ENotApprovedArbiter: u64 = 4;
const EAlreadyVoted: u64 = 5;
const EAlreadyResolved: u64 = 6;
const EDisputePeriodActive: u64 = 7;
const EDisputeAlreadyFiled: u64 = 8;
const EInsufficientBond: u64 = 9;
const EMarketNotFinalized: u64 = 10;
const EAlreadyFinalized: u64 = 11;
const EBettingClosed: u64 = 12;
const EResolutionDeadlinePassed: u64 = 13;
const EInvalidArbiterCount: u64 = 14;
const EMustBeLosingBettor: u64 = 15;

// === One-Time Witness ===

public struct PYTHIA has drop {}

// === Data Structures ===

public struct UserProfile has key {
    id: UID,
    version: u64,
    address: address,
    total_bets: u64,
    total_wins: u64,
    total_amount_bet: u64,
    total_amount_won: u64,
    total_amount_lost: u64,
    markets_created: u64,
    creator_earnings: u64,
    disputes_filed: u64,
    disputes_won: u64,
    last_active_timestamp: u64,
}

public struct ArbiterProfile has drop, store {
    version: u64,
    address: address,
    total_resolutions: u64,
    correct_resolutions: u64,
    approved: bool,
    last_active_timestamp: u64,
    total_earnings: u64,
}

public struct ProtocolConfig has key {
    id: UID,
    version: u64,
    protocol_fee_bps: u64,
    creator_fee_bps: u64,
    arbiter_fee_bps: u64,
    min_bet_amount: u64,
    dispute_bond: u64,
    dispute_period: u64,
    dispute_threshold: u64,
    max_disputes_per_user: u64,
    treasury: address,
    admin: address,
    arbiters: VecMap<address, ArbiterProfile>,
}

public struct Dispute has store {
    market_id: ID,
    supporters: VecSet<address>,
    total_bond: Balance<SUI>,
    reason: String,
    proposed_outcome: bool,
    created_at: u64,
    resolved: bool,
    upheld: bool,
}

public struct Market has key {
    id: UID,
    version: u64,
    description: String,
    betting_end_time: u64,
    resolution_deadline: u64,
    total_yes_amount: u64,
    total_no_amount: u64,
    pot_yes: Balance<SUI>,
    pot_no: Balance<SUI>,
    outcome: Option<bool>,
    creator: address,
    creator_fee_bps: u64,
    arbiters: vector<address>,
    arbiter_threshold: u64,
    arbiter_votes: VecMap<address, bool>,
    resolved: bool,
    dispute_end_time: u64,
    disputed: bool,
    finalized: bool,
    dispute: Option<Dispute>,
}

public struct Position has key {
    id: UID,
    version: u64,
    market_id: ID,
    owner: address,
    is_yes: bool,
    amount: u64,
    claimed: bool,
}

// === Events ===

public struct EventBetPlaced has copy, drop {
    market_id: ID,
    bettor: address,
    is_yes: bool,
    amount: u64,
    new_yes_total: u64,
    new_no_total: u64,
    timestamp: u64,
}

public struct EventMarketCreated has copy, drop {
    market_id: ID,
    creator: address,
    description: String,
    betting_end_time: u64,
    timestamp: u64,
}

public struct EventMarketResolved has copy, drop {
    market_id: ID,
    outcome: bool,
    total_pool: u64,
    timestamp: u64,
}

public struct EventWinningsClaimed has copy, drop {
    market_id: ID,
    user: address,
    amount: u64,
    timestamp: u64,
}

public struct EventDisputeFiled has copy, drop {
    market_id: ID,
    dispute_id: ID,
    challenger: address,
    timestamp: u64,
}

// === Init ===

fun init(otw: PYTHIA, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    // Display for Position
    let keys_pos = vector[string::utf8(b"name"), string::utf8(b"description")];
    let values_pos = vector[
        string::utf8(b"Bet: {is_yes} on Market {market_id}"),
        string::utf8(b"Amount: {amount} MIST"),
    ];
    let mut display_pos = display::new_with_fields<Position>(&publisher, keys_pos, values_pos, ctx);
    display::update_version(&mut display_pos);

    // Display for UserProfile
    let keys_profile = vector[string::utf8(b"name"), string::utf8(b"description")];
    let values_profile = vector[
        string::utf8(b"Bettor Profile"),
        string::utf8(b"Wins: {total_wins} | Bets: {total_bets}"),
    ];
    let mut display_profile = display::new_with_fields<UserProfile>(
        &publisher,
        keys_profile,
        values_profile,
        ctx,
    );
    display::update_version(&mut display_profile);

    // Display for Market
    let keys_market = vector[string::utf8(b"name"), string::utf8(b"description")];
    let values_market = vector[
        string::utf8(b"Market: {description}"),
        string::utf8(b"Ends: {betting_end_time}"),
    ];
    let mut display_market = display::new_with_fields<Market>(
        &publisher,
        keys_market,
        values_market,
        ctx,
    );
    display::update_version(&mut display_market);

    let config = ProtocolConfig {
        id: object::new(ctx),
        version: CURRENT_VERSION,
        protocol_fee_bps: 100, // 1%
        creator_fee_bps: 100, // 1%
        arbiter_fee_bps: 100, // 1%
        min_bet_amount: 1_000_000_000, // 1 SUI
        dispute_bond: 10_000_000_000, // 10 SUI
        dispute_period: 86400 * 1000, // 24 hours in ms
        dispute_threshold: 3,
        max_disputes_per_user: 5,
        treasury: ctx.sender(),
        admin: ctx.sender(),
        arbiters: vec_map::empty(),
    };

    transfer::share_object(config);
    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display_pos, ctx.sender());
    transfer::public_transfer(display_profile, ctx.sender());
    transfer::public_transfer(display_market, ctx.sender());
}

// === Public Functions ===

public fun create_profile(ctx: &mut TxContext) {
    let profile = UserProfile {
        id: object::new(ctx),
        version: CURRENT_VERSION,
        address: ctx.sender(),
        total_bets: 0,
        total_wins: 0,
        total_amount_bet: 0,
        total_amount_won: 0,
        total_amount_lost: 0,
        markets_created: 0,
        creator_earnings: 0,
        disputes_filed: 0,
        disputes_won: 0,
        last_active_timestamp: 0,
    };
    transfer::transfer(profile, ctx.sender());
}

entry fun create_profile_entry(ctx: &mut TxContext) {
    create_profile(ctx);
}

public fun create_market(
    config: &ProtocolConfig,
    description: String,
    betting_end_time: u64,
    resolution_deadline: u64,
    arbiters: vector<address>,
    arbiter_threshold: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(config.version == CURRENT_VERSION, EWrongVersion);
    let timestamp = clock.timestamp_ms();
    assert!(betting_end_time > timestamp, EBettingClosed);
    assert!(resolution_deadline > betting_end_time, EResolutionDeadlinePassed);
    assert!(vector::length(&arbiters) >= arbiter_threshold, EInvalidArbiterCount);
    assert!(arbiter_threshold > 0, EInvalidArbiterCount);

    // Validate arbiters
    let mut i = 0;
    let arbiter_len = vector::length(&arbiters);
    while (i < arbiter_len) {
        let addr = *vector::borrow(&arbiters, i);
        assert!(vec_map::contains(&config.arbiters, &addr), ENotApprovedArbiter);
        let arbiter_profile = vec_map::get(&config.arbiters, &addr);
        assert!(arbiter_profile.approved, ENotApprovedArbiter);
        i = i + 1;
    };

    let market = Market {
        id: object::new(ctx),
        version: CURRENT_VERSION,
        description,
        betting_end_time,
        resolution_deadline,
        total_yes_amount: 0,
        total_no_amount: 0,
        pot_yes: balance::zero(),
        pot_no: balance::zero(),
        outcome: option::none(),
        creator: ctx.sender(),
        creator_fee_bps: config.creator_fee_bps,
        arbiters,
        arbiter_threshold,
        arbiter_votes: vec_map::empty(),
        resolved: false,
        dispute_end_time: 0,
        disputed: false,
        finalized: false,
        dispute: option::none(),
    };

    event::emit(EventMarketCreated {
        market_id: object::id(&market),
        creator: ctx.sender(),
        description: market.description,
        betting_end_time,
        timestamp,
    });

    transfer::share_object(market);
}

entry fun create_market_entry(
    config: &ProtocolConfig,
    description: String,
    betting_end_time: u64,
    resolution_deadline: u64,
    arbiters: vector<address>,
    arbiter_threshold: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    create_market(
        config,
        description,
        betting_end_time,
        resolution_deadline,
        arbiters,
        arbiter_threshold,
        clock,
        ctx,
    );
}

public fun place_bet(
    market: &mut Market,
    config: &ProtocolConfig,
    profile: &mut UserProfile,
    is_yes: bool,
    coin: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(market.version == CURRENT_VERSION && config.version == CURRENT_VERSION, EWrongVersion);
    let timestamp = clock.timestamp_ms();
    assert!(timestamp < market.betting_end_time, EBettingClosed);
    let amount = coin.value();
    assert!(amount >= config.min_bet_amount, EBetTooSmall);

    // Arbiter check
    let mut i = 0;
    let sender = ctx.sender();
    while (i < vector::length(&market.arbiters)) {
        assert!(*vector::borrow(&market.arbiters, i) != sender, EArbiterCannotBet);
        i = i + 1;
    };

    // Update profile
    profile.last_active_timestamp = timestamp;
    profile.total_bets = profile.total_bets + 1;
    profile.total_amount_bet = profile.total_amount_bet + amount;

    // Add to pot
    if (is_yes) {
        market.total_yes_amount = market.total_yes_amount + amount;
        balance::join(&mut market.pot_yes, coin.into_balance());
    } else {
        market.total_no_amount = market.total_no_amount + amount;
        balance::join(&mut market.pot_no, coin.into_balance());
    };

    // Create position
    let position = Position {
        id: object::new(ctx),
        version: CURRENT_VERSION,
        market_id: object::id(market),
        owner: sender,
        is_yes,
        amount,
        claimed: false,
    };

    event::emit(EventBetPlaced {
        market_id: object::id(market),
        bettor: sender,
        is_yes,
        amount,
        new_yes_total: market.total_yes_amount,
        new_no_total: market.total_no_amount,
        timestamp,
    });

    transfer::transfer(position, sender);
}

entry fun place_bet_entry(
    market: &mut Market,
    config: &ProtocolConfig,
    profile: &mut UserProfile,
    is_yes: bool,
    coin: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    place_bet(market, config, profile, is_yes, coin, clock, ctx);
}

public fun submit_resolution(
    market: &mut Market,
    config: &mut ProtocolConfig,
    outcome: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(market.version == CURRENT_VERSION && config.version == CURRENT_VERSION, EWrongVersion);
    let sender = ctx.sender();
    // Check arbiter
    assert!(vector::contains(&market.arbiters, &sender), ENotApprovedArbiter);
    assert!(!vec_map::contains(&market.arbiter_votes, &sender), EAlreadyVoted);
    assert!(!market.resolved, EAlreadyResolved);

    vec_map::insert(&mut market.arbiter_votes, sender, outcome);

    // Update arbiter profile stats (activity)
    let arbiter_profile = vec_map::get_mut(&mut config.arbiters, &sender);
    arbiter_profile.last_active_timestamp = clock.timestamp_ms();
    arbiter_profile.total_resolutions = arbiter_profile.total_resolutions + 1;

    // Check threshold
    let mut yes_votes = 0;
    let mut no_votes = 0;
    let mut i = 0;
    while (i < vec_map::length(&market.arbiter_votes)) {
        let (_, vote) = vec_map::get_entry_by_idx(&market.arbiter_votes, i);
        if (*vote) { yes_votes = yes_votes + 1; } else { no_votes = no_votes + 1; };
        i = i + 1;
    };

    if (yes_votes >= market.arbiter_threshold) {
        resolve_market(market, true, config, clock);
    } else if (no_votes >= market.arbiter_threshold) {
        resolve_market(market, false, config, clock);
    };
}

entry fun submit_resolution_entry(
    market: &mut Market,
    config: &mut ProtocolConfig,
    outcome: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    submit_resolution(market, config, outcome, clock, ctx);
}

fun resolve_market(market: &mut Market, outcome: bool, config: &ProtocolConfig, clock: &Clock) {
    market.outcome = option::some(outcome);
    market.resolved = true;
    market.dispute_end_time = clock.timestamp_ms() + config.dispute_period;

    event::emit(EventMarketResolved {
        market_id: object::id(market),
        outcome,
        total_pool: market.total_yes_amount + market.total_no_amount,
        timestamp: clock.timestamp_ms(),
    });
}

// === Dispute Functions ===

public fun file_dispute(
    market: &mut Market,
    config: &ProtocolConfig,
    profile: &mut UserProfile,
    payment: Coin<SUI>,
    position: &Position, // New argument
    reason: String,
    proposed_outcome: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    let timestamp = clock.timestamp_ms();
    assert!(market.resolved, EMarketNotFinalized);
    assert!(timestamp < market.dispute_end_time, EDisputePeriodActive);
    assert!(coin::value(&payment) >= config.dispute_bond, EInsufficientBond);
    assert!(profile.address == sender, EWrongVersion); // Ensure profile belongs to sender

    // Verify Challenger is a loser
    assert!(position.market_id == object::id(market), EMustBeLosingBettor);
    assert!(position.owner == sender, EMustBeLosingBettor);
    if (option::is_some(&market.outcome)) {
        let outcome = *option::borrow(&market.outcome);
        // If outcome is YES (true), challenger must have NO (false)
        assert!(position.is_yes != outcome, EMustBeLosingBettor);
    };

    // Update profile
    profile.disputes_filed = profile.disputes_filed + 1;
    profile.last_active_timestamp = timestamp;

    // If dispute exists, join it
    if (option::is_some(&market.dispute)) {
        let dispute = option::borrow_mut(&mut market.dispute);
        assert!(!vec_set::contains(&dispute.supporters, &sender), EDisputeAlreadyFiled);
        vec_set::insert(&mut dispute.supporters, sender);
        balance::join(&mut dispute.total_bond, coin::into_balance(payment));
    } else {
        // Create new dispute
        let mut supporters = vec_set::empty();
        vec_set::insert(&mut supporters, sender);

        let dispute = Dispute {
            market_id: object::id(market),
            supporters,
            total_bond: coin::into_balance(payment),
            reason,
            proposed_outcome,
            created_at: timestamp,
            resolved: false,
            upheld: false,
        };

        option::fill(&mut market.dispute, dispute);
        market.disputed = true;
    };

    event::emit(EventDisputeFiled {
        market_id: object::id(market),
        dispute_id: object::id(market), // Reusing market ID as dispute ID context
        challenger: sender,
        timestamp,
    });
}

entry fun file_dispute_entry(
    market: &mut Market,
    config: &ProtocolConfig,
    profile: &mut UserProfile,
    payment: Coin<SUI>,
    position: &Position, // New Argument
    reason: String,
    proposed_outcome: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    file_dispute(market, config, profile, payment, position, reason, proposed_outcome, clock, ctx);
}

public fun resolve_dispute(
    market: &mut Market,
    config: &mut ProtocolConfig,
    outcome: bool,
    ctx: &mut TxContext,
) {
    assert!(config.admin == ctx.sender(), ENotAdmin);
    assert!(option::is_some(&market.dispute), EDisputeAlreadyFiled);

    let dispute = option::extract(&mut market.dispute);
    let Dispute {
        market_id: _,
        supporters: _,
        total_bond,
        reason: _,
        proposed_outcome,
        created_at: _,
        resolved: _,
        upheld: _,
    } = dispute;

    if (outcome) {
        // Dispute upheld -> Change outcome
        market.outcome = option::some(proposed_outcome);

        // Return bonds to treasury for manual distribution
        let payment = coin::from_balance(total_bond, ctx);
        transfer::public_transfer(payment, config.treasury);
    } else {
        // Dispute rejected -> Arbiter decision stands
        // Bond to Treasury
        let payment = coin::from_balance(total_bond, ctx);
        transfer::public_transfer(payment, config.treasury);
    };

    settle_market(market, config, ctx);

    market.finalized = true;
}

entry fun resolve_dispute_entry(
    market: &mut Market,
    config: &mut ProtocolConfig,
    outcome: bool,
    ctx: &mut TxContext,
) {
    resolve_dispute(market, config, outcome, ctx);
}

// === Finalize & Claim ===

fun settle_market(market: &mut Market, config: &mut ProtocolConfig, ctx: &mut TxContext) {
    // Merge pots
    balance::join(&mut market.pot_yes, balance::withdraw_all(&mut market.pot_no));

    // Extract Fees
    let total_pot = balance::value(&market.pot_yes);
    let protocol_amt = (total_pot * config.protocol_fee_bps) / 10000;
    let creator_amt = (total_pot * market.creator_fee_bps) / 10000;
    let arbiter_amt = (total_pot * config.arbiter_fee_bps) / 10000;

    // Pay Protocol
    if (protocol_amt > 0) {
        let protocol_coin = coin::take(&mut market.pot_yes, protocol_amt, ctx);
        transfer::public_transfer(protocol_coin, config.treasury);
    };

    // Pay Creator
    if (creator_amt > 0) {
        let creator_coin = coin::take(&mut market.pot_yes, creator_amt, ctx);
        transfer::public_transfer(creator_coin, market.creator);
    };

    // Pay Arbiters (CORRECT VOTES ONLY)
    if (arbiter_amt > 0) {
        let mut arbiter_coin = coin::take(&mut market.pot_yes, arbiter_amt, ctx);

        // Filter correct voters (approved arbiters who voted correctly)
        let final_outcome = *option::borrow(&market.outcome);
        let mut correct_voter_count = 0;
        let mut i = 0;
        while (i < vec_map::length(&market.arbiter_votes)) {
            let (arbiter_addr, vote) = vec_map::get_entry_by_idx(&market.arbiter_votes, i);
            if (*vote == final_outcome && vec_map::contains(&config.arbiters, arbiter_addr)) {
                let profile = vec_map::get(&config.arbiters, arbiter_addr);
                if (profile.approved) {
                    correct_voter_count = correct_voter_count + 1;
                };
            };
            i = i + 1;
        };

        if (correct_voter_count > 0) {
            let share_amount = arbiter_amt / correct_voter_count;
            let mut i = 0;
            while (i < vec_map::length(&market.arbiter_votes)) {
                let (arbiter_addr, vote) = vec_map::get_entry_by_idx(&market.arbiter_votes, i);

                // Only pay if correct, approved, and exists in protocol config
                if (*vote == final_outcome && vec_map::contains(&config.arbiters, arbiter_addr)) {
                    let profile = vec_map::get(&config.arbiters, arbiter_addr);
                    if (profile.approved) {
                        let payment = coin::split(&mut arbiter_coin, share_amount, ctx);
                        transfer::public_transfer(payment, *arbiter_addr);

                        // Update earnings and correct resolutions
                        let mut_profile = vec_map::get_mut(&mut config.arbiters, arbiter_addr);
                        mut_profile.total_earnings = mut_profile.total_earnings + share_amount;
                        mut_profile.correct_resolutions = mut_profile.correct_resolutions + 1;
                    };
                };
                i = i + 1;
            };
        };

        // Send remaining (dust or if no correct voters) to treasury
        transfer::public_transfer(arbiter_coin, config.treasury);
    };

    market.finalized = true;
    market.arbiter_votes = vec_map::empty();
}

public fun finalize_market(
    market: &mut Market,
    config: &mut ProtocolConfig,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(market.resolved, EAlreadyResolved);
    assert!(!market.finalized, EAlreadyFinalized);
    assert!(clock.timestamp_ms() > market.dispute_end_time, EDisputePeriodActive);
    assert!(option::is_none(&market.dispute), EDisputePeriodActive);

    settle_market(market, config, ctx);
}

entry fun finalize_market_entry(
    market: &mut Market,
    config: &mut ProtocolConfig,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    finalize_market(market, config, clock, ctx);
}

public fun claim(
    market: &mut Market,
    _config: &ProtocolConfig,
    position: Position,
    profile: &mut UserProfile,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(market.finalized, EMarketNotFinalized);
    assert!(position.market_id == object::id(market), EWrongVersion);

    let Position { id, version: _, market_id: _, owner, is_yes, amount, claimed: _ } = position;
    object::delete(id);

    let outcome = *option::borrow(&market.outcome);

    if (is_yes == outcome) {
        // WIN
        let winning_bets_total = if (outcome) { market.total_yes_amount } else {
            market.total_no_amount
        };

        if (winning_bets_total > 0) {
            let current_pot_value = balance::value(&market.pot_yes);
            let user_share =
                (
                    ((amount as u128) * (current_pot_value as u128)) / (winning_bets_total as u128),
                ) as u64;

            if (user_share > 0) {
                let winnings = coin::take(&mut market.pot_yes, user_share, ctx);
                transfer::public_transfer(winnings, owner);

                profile.total_wins = profile.total_wins + 1;
                profile.total_amount_won = profile.total_amount_won + user_share;

                event::emit(EventWinningsClaimed {
                    market_id: object::id(market),
                    user: owner,
                    amount: user_share,
                    timestamp: clock.timestamp_ms(),
                });
            };
        };
    } else {
        // LOSS
        profile.total_amount_lost = profile.total_amount_lost + amount;
    };
}

entry fun claim_entry(
    market: &mut Market,
    config: &ProtocolConfig,
    position: Position,
    profile: &mut UserProfile,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    claim(market, config, position, profile, clock, ctx);
}

// === Admin Functions ===

public fun approve_arbiter(config: &mut ProtocolConfig, arbiter: address, ctx: &mut TxContext) {
    assert!(config.admin == ctx.sender(), ENotAdmin);

    if (!vec_map::contains(&config.arbiters, &arbiter)) {
        let profile = ArbiterProfile {
            version: CURRENT_VERSION,
            address: arbiter,
            total_resolutions: 0,
            correct_resolutions: 0,
            approved: true,
            last_active_timestamp: 0,
            total_earnings: 0,
        };
        vec_map::insert(&mut config.arbiters, arbiter, profile);
    };
}

entry fun approve_arbiter_entry(
    config: &mut ProtocolConfig,
    arbiter: address,
    ctx: &mut TxContext,
) {
    approve_arbiter(config, arbiter, ctx);
}

public fun revoke_arbiter(config: &mut ProtocolConfig, arbiter: address, ctx: &mut TxContext) {
    assert!(config.admin == ctx.sender(), ENotAdmin);
    assert!(vec_map::contains(&config.arbiters, &arbiter), ENotApprovedArbiter);

    let profile = vec_map::get_mut(&mut config.arbiters, &arbiter);
    profile.approved = false;
}

entry fun revoke_arbiter_entry(config: &mut ProtocolConfig, arbiter: address, ctx: &mut TxContext) {
    revoke_arbiter(config, arbiter, ctx);
}

#[test_only]
public fun test_init(ctx: &mut TxContext) {
    init(PYTHIA {}, ctx);
}

#[test_only]
public fun is_market_resolved(market: &Market): bool {
    market.resolved
}

#[test_only]
public fun get_market_outcome(market: &Market): Option<bool> {
    market.outcome
}

#[test_only]
public fun get_arbiter_earnings(config: &ProtocolConfig, arbiter: address): u64 {
    let profile = vec_map::get(&config.arbiters, &arbiter);
    profile.total_earnings
}

public fun acknowledge_dispute_win(
    profile: &mut UserProfile,
    market: &Market,
    ctx: &mut TxContext,
) {
    assert!(profile.address == ctx.sender(), EWrongVersion);
    assert!(option::is_some(&market.dispute), EDisputeAlreadyFiled);
    let dispute = option::borrow(&market.dispute);
    assert!(dispute.upheld, EDisputeAlreadyFiled); // Only if upheld
    assert!(vec_set::contains(&dispute.supporters, &ctx.sender()), ENotApprovedArbiter); // Must be supporter
    // Note: No check for multiple calls, user can call multiple times, but perhaps ok

    profile.disputes_won = profile.disputes_won + 1;
}

entry fun acknowledge_dispute_win_entry(
    profile: &mut UserProfile,
    market: &Market,
    ctx: &mut TxContext,
) {
    acknowledge_dispute_win(profile, market, ctx);
}
