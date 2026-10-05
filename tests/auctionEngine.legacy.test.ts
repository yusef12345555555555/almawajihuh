// ============================================================
// العبها صح | EL3BHA SA7 - Comprehensive Auction Engine Test Suite
// ============================================================

import { AuctionEngine } from '../src/services/auctionEngine';
import { AuctionRoomSettings, RoomParticipant } from '../types';

export function runAuctionEngineTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      passed++;
      results.push(`✅ PASS: ${message}`);
    } else {
      failed++;
      results.push(`❌ FAIL: ${message}`);
      console.error(`Assertion failed: ${message}`);
    }
  };

  console.log('--- Starting EL3BHA SA7 Auction Engine Comprehensive Test Suite ---');

  // Test 1: Classic Format Initialization
  {
    const user: RoomParticipant = {
      userId: 'u1',
      userName: 'Player 1',
      userAvatar: '',
      isHost: true,
      isReady: true,
      isBot: false,
      budget: 100,
      squad: [],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false
    };

    const settings: AuctionRoomSettings = {
      budgetMode: '100M',
      initialBudget: 100,
      squadSize: 5,
      bidTimerSeconds: 30,
      bidTimeLimitSeconds: 30,
      bidIncrement: 5,
      fastBidConfirm: false,
      allowBots: true,
      mysteryPlayerChance: 0.2,
      lastBidEnabled: false,
      wildCardEnabled: false,
      noRiskEnabled: false
    };

    const engine = new AuctionEngine(user, settings);
    const state = engine.getState();

    assert(state.totalRounds === 5, 'Classic format has 5 total rounds');
    assert(state.participants[0].budget === 100, 'User starts with 100M budget');
    assert(state.participants.length === 2, 'Room is strictly 1v1 with 2 participants');
    assert(state.lastBidEnabled === false, 'Standard Skip mode initialized with lastBidEnabled = false');
    assert(state.timerRemaining === 30, 'Timer initialized to 30 seconds');
  }

  // Test 2: Pro Format Initialization
  {
    const user: RoomParticipant = {
      userId: 'u1',
      userName: 'Player 1',
      userAvatar: '',
      isHost: true,
      isReady: true,
      isBot: false,
      budget: 200,
      squad: [],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false
    };

    const settings: AuctionRoomSettings = {
      budgetMode: '200M',
      initialBudget: 200,
      squadSize: 11,
      bidTimerSeconds: 30,
      bidTimeLimitSeconds: 30,
      bidIncrement: 5,
      fastBidConfirm: false,
      allowBots: true,
      mysteryPlayerChance: 0.2,
      lastBidEnabled: true,
      wildCardEnabled: true,
      noRiskEnabled: true
    };

    const engine = new AuctionEngine(user, settings);
    const state = engine.getState();

    assert(state.totalRounds === 11, 'Pro format has 11 total rounds');
    assert(state.participants[0].budget === 200, 'User starts with 200M budget');
    assert(state.lastBidEnabled === true, 'Last Bid mode active');
    assert(state.wildCardEnabled === true, 'Wild Card enabled');
    assert(state.noRiskEnabled === true, 'No Risk No Fun enabled');
  }

  // Test 3: Positional Sequencing
  {
    const user: RoomParticipant = {
      userId: 'u1',
      userName: 'Player 1',
      userAvatar: '',
      isHost: true,
      isReady: true,
      isBot: false,
      budget: 100,
      squad: [],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false
    };

    const settings: AuctionRoomSettings = {
      budgetMode: '100M',
      initialBudget: 100,
      squadSize: 5,
      bidTimerSeconds: 30,
      bidTimeLimitSeconds: 30,
      bidIncrement: 5,
      fastBidConfirm: false,
      allowBots: true,
      mysteryPlayerChance: 0.2
    };

    const engine = new AuctionEngine(user, settings);
    const r1 = engine.getTargetPositionForRound(1, 5);
    const r2 = engine.getTargetPositionForRound(2, 5);
    const r3 = engine.getTargetPositionForRound(3, 5);
    const r5 = engine.getTargetPositionForRound(5, 5);

    assert(r1.category === 'حراسة المرمى (GK)', 'Round 1 is GK');
    assert(r2.category === 'الدفاع (DEF)', 'Round 2 is DEF');
    assert(r3.category === 'وسط الملعب (MID)', 'Round 3 is MID');
    assert(r5.category === 'الهجوم (ATT)', 'Round 5 is ATT');
  }

  // Test 4: Invalid Bids Rejection
  {
    const user: RoomParticipant = {
      userId: 'u1',
      userName: 'Player 1',
      userAvatar: '',
      isHost: true,
      isReady: true,
      isBot: false,
      budget: 100,
      squad: [],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false
    };

    const settings: AuctionRoomSettings = {
      budgetMode: '100M',
      initialBudget: 100,
      squadSize: 5,
      bidTimerSeconds: 30,
      bidTimeLimitSeconds: 30,
      bidIncrement: 5,
      fastBidConfirm: false,
      allowBots: true,
      mysteryPlayerChance: 0.2
    };

    const engine = new AuctionEngine(user, settings);
    // Bidding before active state
    const resLobby = engine.placeBid('u1', 20);
    assert(resLobby.success === false, 'Cannot bid while in lobby/inactive state');
  }

  // Test 5: Wild Card Execution
  {
    const user: RoomParticipant = {
      userId: 'u1',
      userName: 'Player 1',
      userAvatar: '',
      isHost: true,
      isReady: true,
      isBot: false,
      budget: 100,
      squad: [
        {
          id: 'test_gk_1',
          name: 'Test Keeper',
          nameAr: 'حارس تجريبي',
          position: 'GK',
          overallRating: 80,
          nationality: 'Egypt',
          nationalityAr: 'مصر',
          countryCode: 'eg',
          era: '2024',
          club: 'Al Ahly',
          clubAr: 'الأهلي',
          rarity: 'Rare',
          marketValue: 20,
          photoUrl: '',
          attributes: { pace: 70, shooting: 50, passing: 60, dribbling: 60, defending: 80, physical: 75 },
          clues: ['حارس مرمى']
        }
      ],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false,
      wildCardsAvailable: 1,
      hasUsedWildCard: false
    };

    const settings: AuctionRoomSettings = {
      budgetMode: '100M',
      initialBudget: 100,
      squadSize: 5,
      bidTimerSeconds: 30,
      bidTimeLimitSeconds: 30,
      bidIncrement: 5,
      fastBidConfirm: false,
      allowBots: true,
      mysteryPlayerChance: 0.2,
      wildCardEnabled: true
    };

    const engine = new AuctionEngine(user, settings);
    const state = engine.getState();
    state.participants[0].squad = [...user.squad];
    state.participants[0].wildCardsAvailable = 1;

    const wcResult = engine.useWildCard('u1', 'test_gk_1');
    assert(wcResult.success === true, 'Wild Card successfully swapped player');
    assert(state.participants[0].wildCardsAvailable === 0, 'Wild Card depleted after use');
  }

  // Test 6: Custom Bid Amount & Minor Units Precision
  {
    const user: RoomParticipant = {
      userId: 'u1',
      userName: 'Player 1',
      userAvatar: '',
      isHost: true,
      isReady: true,
      isBot: false,
      budget: 100,
      squad: [],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false,
      lastValidBidInRound: 0
    };

    const settings: AuctionRoomSettings = {
      budgetMode: '100M',
      initialBudget: 100,
      squadSize: 5,
      bidTimerSeconds: 30,
      bidTimeLimitSeconds: 30,
      bidIncrement: 1,
      fastBidConfirm: false,
      allowBots: false,
      mysteryPlayerChance: 0
    };

    const engine = new AuctionEngine(user, settings);
    const state = engine.getState();
    state.state = 'BIDDING';
    state.currentPlayer = {
      id: 'test_p1',
      name: 'Test Striker',
      nameAr: 'مهاجم تجريبي',
      position: 'ST',
      overallRating: 88,
      nationality: 'Egypt',
      nationalityAr: 'مصر',
      countryCode: 'eg',
      era: '2024',
      club: 'Liverpool',
      clubAr: 'ليفربول',
      rarity: 'Legend',
      marketValue: 50,
      photoUrl: '',
      attributes: { pace: 90, shooting: 90, passing: 80, dribbling: 85, defending: 40, physical: 75 },
      clues: []
    };

    // Test default minimum next bid (1M starting bid)
    const initialMin = engine.getMinimumNextBid();
    assert(initialMin === 1, 'Initial minimum next bid is 1M');

    // Place custom starting bid of 7.5M with requestId
    const bid1 = engine.placeBid('u1', 7.5, 'req_001');
    assert(bid1.success === true, 'Custom starting bid of 7.5M succeeded');
    assert(state.currentHighBid?.amount === 7.5, 'Current high bid is updated to 7.5M');
    assert(state.participants[0].lastValidBidInRound === 7.5, 'User last valid bid is recorded as 7.5M');

    // Test duplicate requestId rejection (idempotency)
    const dupBid = engine.placeBid('u1', 8.5, 'req_001');
    assert(dupBid.success === false, 'Duplicate requestId is rejected for idempotency');

    // Test lower bid rejection
    const lowBid = engine.placeBid('u1', 5);
    assert(lowBid.success === false, 'Lower bid than current high bid is rejected');

    // Test over-budget rejection
    const overBid = engine.placeBid('u1', 150);
    assert(overBid.success === false, 'Bid exceeding participant budget is rejected');
  }

  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  return { passed, failed, results };
}

// Auto-run tests in development/test environment
if (typeof window !== 'undefined') {
  (window as any).__runAuctionTests = runAuctionEngineTests;
}
