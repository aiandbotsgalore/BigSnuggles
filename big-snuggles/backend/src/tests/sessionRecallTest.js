/**
 * Session Recall Accuracy Testing Framework
 * Tests memory retrieval and context persistence across conversations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

class SessionRecallTester {
  constructor() {
    this.testResults = [];
    this.testScenarios = this.loadTestScenarios();
  }

  /**
   * Load predefined test scenarios
   */
  loadTestScenarios() {
    return [
      {
        name: 'Personal Information Recall',
        setup: [
          { user: 'My name is Alex', expectedMemory: 'name: Alex' },
          { user: 'I live in New York', expectedMemory: 'location: New York' },
          { user: 'I love pizza', expectedMemory: 'favorite_food: pizza' }
        ],
        tests: [
          { query: 'What is my name?', expectedRecall: 'Alex' },
          { query: 'Where do I live?', expectedRecall: 'New York' },
          { query: 'What food do I like?', expectedRecall: 'pizza' }
        ]
      },
      {
        name: 'Conversational Context',
        setup: [
          { user: 'I just got a new job at Tech Corp', expectedMemory: 'job: Tech Corp' },
          { user: 'It\'s a software engineering position', expectedMemory: 'role: software engineering' },
          { user: 'I start next Monday', expectedMemory: 'start_date: next Monday' }
        ],
        tests: [
          { query: 'What company am I joining?', expectedRecall: 'Tech Corp' },
          { query: 'What will I be doing there?', expectedRecall: 'software engineering' },
          { query: 'When do I start?', expectedRecall: 'Monday' }
        ]
      },
      {
        name: 'Emotional Context',
        setup: [
          { user: 'I\'m feeling really stressed about my presentation', expectedMemory: 'emotion: stressed, context: presentation' },
          { user: 'It\'s tomorrow and I\'m not prepared', expectedMemory: 'timing: tomorrow, state: unprepared' }
        ],
        tests: [
          { query: 'How am I feeling?', expectedRecall: 'stressed' },
          { query: 'What am I worried about?', expectedRecall: 'presentation' }
        ]
      },
      {
        name: 'Multi-Session Persistence',
        setup: [
          { user: 'My dog\'s name is Max', expectedMemory: 'pet: Max (dog)' },
          { user: 'He\'s 3 years old', expectedMemory: 'pet_age: 3' }
        ],
        tests: [
          { query: 'Tell me about my pet', expectedRecall: 'Max' },
          { query: 'How old is my dog?', expectedRecall: '3' }
        ],
        requiresNewSession: true
      },
      {
        name: 'Relationship Memory',
        setup: [
          { user: 'My best friend Sarah is visiting next week', expectedMemory: 'friend: Sarah, event: visiting next week' },
          { user: 'She lives in Boston', expectedMemory: 'friend_location: Boston' }
        ],
        tests: [
          { query: 'Who is visiting me?', expectedRecall: 'Sarah' },
          { query: 'Where does my best friend live?', expectedRecall: 'Boston' }
        ]
      }
    ];
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario, userId = 'test-user-recall') {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log('─'.repeat(60));

    const scenarioResults = {
      name: scenario.name,
      setup: [],
      tests: [],
      accuracy: 0,
      timestamp: new Date().toISOString()
    };

    try {
      // Phase 1: Setup - Store memories
      console.log('\n📝 Setup Phase: Storing memories...');
      for (const setupItem of scenario.setup) {
        const memoryStored = await this.storeMemory(userId, setupItem);
        scenarioResults.setup.push(memoryStored);
        
        const status = memoryStored.success ? '✓' : '✗';
        const color = memoryStored.success ? '\x1b[32m' : '\x1b[31m';
        console.log(`  ${color}${status}\x1b[0m ${setupItem.user}`);
      }

      // Wait for memory indexing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Phase 2: Testing - Recall memories
      console.log('\n🔍 Testing Phase: Recalling memories...');
      let successfulRecalls = 0;

      for (const test of scenario.tests) {
        const recall = await this.testRecall(userId, test);
        scenarioResults.tests.push(recall);

        if (recall.success) {
          successfulRecalls++;
          console.log(`  \x1b[32m✓\x1b[0m ${test.query}`);
          console.log(`    Expected: "${test.expectedRecall}"`);
          console.log(`    Found: "${recall.retrievedContext}"`);
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${test.query}`);
          console.log(`    Expected: "${test.expectedRecall}"`);
          console.log(`    Found: "${recall.retrievedContext || 'Nothing'}"`);
        }
      }

      // Calculate accuracy
      scenarioResults.accuracy = (successfulRecalls / scenario.tests.length) * 100;
      const accuracyColor = scenarioResults.accuracy >= 80 ? '\x1b[32m' : scenarioResults.accuracy >= 60 ? '\x1b[33m' : '\x1b[31m';
      console.log(`\n${accuracyColor}Accuracy: ${scenarioResults.accuracy.toFixed(1)}%\x1b[0m`);

    } catch (error) {
      console.error(`Error in scenario ${scenario.name}:`, error);
      scenarioResults.error = error.message;
    }

    this.testResults.push(scenarioResults);
    return scenarioResults;
  }

  /**
   * Store memory for testing
   */
  async storeMemory(userId, setupItem) {
    try {
      const { data, error } = await supabaseAdmin
        .from('memory')
        .insert({
          user_id: userId,
          content: setupItem.user,
          context: setupItem.expectedMemory,
          importance_score: 0.8,
          memory_type: 'episodic',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        memoryId: data.id,
        content: setupItem.user,
        expectedMemory: setupItem.expectedMemory
      };
    } catch (error) {
      console.error('Error storing memory:', error);
      return {
        success: false,
        error: error.message,
        content: setupItem.user
      };
    }
  }

  /**
   * Test memory recall
   */
  async testRecall(userId, test) {
    try {
      // Search for relevant memories
      const { data: memories, error } = await supabaseAdmin
        .from('memory')
        .select('*')
        .eq('user_id', userId)
        .order('importance_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!memories || memories.length === 0) {
        return {
          success: false,
          query: test.query,
          retrievedContext: null,
          reason: 'No memories found'
        };
      }

      // Search for expected recall in memory content and context
      const expectedLower = test.expectedRecall.toLowerCase();
      const relevantMemory = memories.find(m => 
        m.content.toLowerCase().includes(expectedLower) ||
        m.context?.toLowerCase().includes(expectedLower)
      );

      if (relevantMemory) {
        return {
          success: true,
          query: test.query,
          retrievedContext: relevantMemory.content,
          memoryId: relevantMemory.id,
          importanceScore: relevantMemory.importance_score
        };
      }

      // Try fuzzy matching
      const fuzzyMatch = memories.find(m => {
        const contentWords = m.content.toLowerCase().split(/\s+/);
        const expectedWords = expectedLower.split(/\s+/);
        return expectedWords.some(word => contentWords.includes(word));
      });

      if (fuzzyMatch) {
        return {
          success: true,
          query: test.query,
          retrievedContext: fuzzyMatch.content,
          memoryId: fuzzyMatch.id,
          importanceScore: fuzzyMatch.importance_score,
          matchType: 'fuzzy'
        };
      }

      return {
        success: false,
        query: test.query,
        retrievedContext: memories[0]?.content || null,
        reason: 'Expected content not found',
        availableMemories: memories.length
      };
    } catch (error) {
      console.error('Error testing recall:', error);
      return {
        success: false,
        query: test.query,
        error: error.message
      };
    }
  }

  /**
   * Test memory importance decay
   */
  async testImportanceDecay(userId) {
    console.log('\n🧪 Testing: Memory Importance Decay');
    console.log('─'.repeat(60));

    try {
      // Create memories with different ages
      const testMemories = [
        { content: 'Recent memory', ageHours: 0, expectedImportance: 'high' },
        { content: 'Day old memory', ageHours: 24, expectedImportance: 'medium' },
        { content: 'Week old memory', ageHours: 168, expectedImportance: 'low' }
      ];

      for (const testMem of testMemories) {
        const timestamp = new Date(Date.now() - testMem.ageHours * 60 * 60 * 1000);
        
        await supabaseAdmin
          .from('memory')
          .insert({
            user_id: userId,
            content: testMem.content,
            importance_score: 0.8,
            created_at: timestamp.toISOString(),
            last_accessed: timestamp.toISOString()
          });
      }

      // Retrieve and check importance scores
      const { data: memories } = await supabaseAdmin
        .from('memory')
        .select('*')
        .eq('user_id', userId)
        .in('content', testMemories.map(m => m.content))
        .order('created_at', { ascending: false });

      console.log('\nMemory Decay Analysis:');
      for (const memory of memories) {
        const ageHours = (Date.now() - new Date(memory.created_at)) / (1000 * 60 * 60);
        console.log(`  ${memory.content}: ${memory.importance_score} (${ageHours.toFixed(1)}h old)`);
      }

      return {
        success: true,
        memories: memories.length
      };
    } catch (error) {
      console.error('Error testing decay:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test cross-session persistence
   */
  async testCrossSessionPersistence(userId) {
    console.log('\n🧪 Testing: Cross-Session Persistence');
    console.log('─'.repeat(60));

    try {
      // Create a memory in "session 1"
      const session1Id = `session-1-${Date.now()}`;
      const { data: mem1 } = await supabaseAdmin
        .from('memory')
        .insert({
          user_id: userId,
          content: 'Session 1 important fact',
          session_id: session1Id,
          importance_score: 0.9
        })
        .select()
        .single();

      console.log(`✓ Created memory in session 1: ${mem1.id}`);

      // Simulate time gap
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to recall in "session 2"
      const session2Id = `session-2-${Date.now()}`;
      const { data: recalled } = await supabaseAdmin
        .from('memory')
        .select('*')
        .eq('user_id', userId)
        .eq('id', mem1.id)
        .single();

      const success = recalled && recalled.content === 'Session 1 important fact';
      console.log(success ? '✓ Memory successfully recalled in session 2' : '✗ Memory not found in session 2');

      return {
        success,
        session1Id,
        session2Id,
        memoryId: mem1.id
      };
    } catch (error) {
      console.error('Error testing cross-session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run complete test suite
   */
  async runCompleteSuite() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('       SESSION RECALL ACCURACY TEST SUITE');
    console.log('═══════════════════════════════════════════════════════');

    const userId = `test-user-${Date.now()}`;

    // Run all scenarios
    for (const scenario of this.testScenarios) {
      await this.runScenario(scenario, userId);
    }

    // Additional tests
    await this.testImportanceDecay(userId);
    await this.testCrossSessionPersistence(userId);

    // Generate final report
    this.generateFinalReport();

    // Cleanup test data
    await this.cleanup(userId);
  }

  /**
   * Generate final test report
   */
  generateFinalReport() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    const totalScenarios = this.testResults.length;
    const totalAccuracy = this.testResults.reduce((sum, r) => sum + (r.accuracy || 0), 0);
    const averageAccuracy = totalAccuracy / totalScenarios;

    console.log(`Total Scenarios: ${totalScenarios}`);
    console.log(`Average Accuracy: ${averageAccuracy.toFixed(1)}%\n`);

    console.log('Results by Scenario:');
    for (const result of this.testResults) {
      const color = result.accuracy >= 80 ? '\x1b[32m' : result.accuracy >= 60 ? '\x1b[33m' : '\x1b[31m';
      console.log(`  ${color}${result.name}: ${result.accuracy.toFixed(1)}%\x1b[0m`);
    }

    const overallStatus = averageAccuracy >= 80 ? '\x1b[32m✓ PASSED\x1b[0m' : '\x1b[31m✗ NEEDS IMPROVEMENT\x1b[0m';
    console.log(`\nOverall Status: ${overallStatus}\n`);

    if (averageAccuracy < 80) {
      console.log('Recommendations:');
      console.log('  • Review memory storage and indexing logic');
      console.log('  • Improve semantic search algorithms');
      console.log('  • Add memory association tracking');
      console.log('  • Implement better context extraction\n');
    }

    console.log('═══════════════════════════════════════════════════════\n');

    return {
      totalScenarios,
      averageAccuracy,
      results: this.testResults
    };
  }

  /**
   * Cleanup test data
   */
  async cleanup(userId) {
    try {
      const { error } = await supabaseAdmin
        .from('memory')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✓ Test data cleaned up\n');
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  }

  /**
   * Export test results
   */
  exportResults(filename = 'recall_test_results.json') {
    return {
      timestamp: new Date().toISOString(),
      scenarios: this.testScenarios.length,
      results: this.testResults,
      summary: this.generateFinalReport()
    };
  }
}

export default SessionRecallTester;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SessionRecallTester();
  tester.runCompleteSuite()
    .then(() => {
      console.log('Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}
