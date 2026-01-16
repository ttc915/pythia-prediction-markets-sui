# Pythia — Decentralized Prediction Markets on Sui

[![License](https://img.shields.io/github/license/ttc915/pythia-prediction-markets-sui?color=0a7cff)](./LICENSE)
[![Stars](https://img.shields.io/github/stars/ttc915/pythia-prediction-markets-sui?color=ffb703)](https://github.com/ttc915/pythia-prediction-markets-sui/stargazers)
[![Forks](https://img.shields.io/github/forks/ttc915/pythia-prediction-markets-sui?color=9b59b6)](https://github.com/ttc915/pythia-prediction-markets-sui/network)
[![Built with Move](https://img.shields.io/badge/Built%20with-Move%20%2F%20Sui-0c8ce9)](https://docs.sui.io/learn)
[![Hackathon Winner](<https://img.shields.io/badge/Hackathon-1st%20Place%20(DeFi)%202025-f97316>)](https://sui.io/)

🏆 **1st Place (DeFi)** & **Fastest to MVP** — Sui Romanian Hackathon (Cluj-Napoca, Dec 2025)

Pythia is a decentralized prediction market protocol on **Sui**. It enables trustless creation, participation, and settlement of markets on real-world events with transparent, on-chain resolution.

---

## 🚀 My Impact

I led the **smart contract development** end-to-end, focusing on protocol design, security, and efficiency:

- Built the **core market engine** with precise state transitions and invariant checks
- Designed **multi-sig arbiter resolution** and **bonded dispute** flows
- Optimized **on-chain storage and gas usage** with object-efficient patterns
- Authored **full Move test suite** covering lifecycle, disputes, fees, and edge cases
- Partnered with frontend to align contract events/APIs for a seamless UX

---

## 🧠 Product Highlights

- **Prediction Markets:** YES/NO markets for future events
- **Multi-Sig Resolution:** Configurable arbiter thresholds
- **Dispute System:** Bonded challenges to deter incorrect outcomes
- **User Profiles:** On-chain history, reputation, earnings
- **Protocol Economics:** Fees for creators, arbiters, treasury
- **Storage Optimization:** Auto-cleanup on settlement
- **zkLogin Support:** Google login or standard Sui wallets

---

## 🛠️ Tech Snapshot

- **Smart Contracts:** Move (Sui)
- **Blockchain:** Sui
- **Frontend:** React + TypeScript
- **Tooling:** Suibase, pnpm, Node.js
- **Testing:** Move unit + integration

---

## 🧪 Test Coverage

- Market lifecycle: creation → betting → resolution → claiming
- Multi-arbiter consensus logic
- Dispute filing and challenge resolution
- Fee distribution & economic safety
- Edge cases and invalid transitions

---

## 🏗️ Architecture Snapshot

### Smart Contracts (Move)

- Core market engine and settlement
- Multi-signature arbiter system
- Dispute + reputation tracking
- Protocol config and access control

### Frontend

- Market creation and browsing
- Betting + portfolio management
- Dispute filing and arbiter dashboard

---

## ▶️ Quick Start (Local)

```bash
pnpm install
pnpm localnet:start
pnpm localnet:deploy
pnpm start
```

Frontend: http://localhost:5173

---

## 🌍 Live Demo

https://pythia-frontend-zeta.vercel.app

---

## 🧾 Origin

Built at **Sui Romanian Hackathon (Cluj-Napoca, Dec 12–14, 2025)**.

Original repo: https://github.com/Sui-Romanian-Hackathon/pythia

This fork is my **personal showcase** of the smart contract work and ongoing protocol evolution.
