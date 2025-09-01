// Simple test script to verify database setup
import { DatabaseTester } from './dist/database/testDatabase.js';

console.log('🚀 Running Database Verification Tests...\n');

const tester = new DatabaseTester();
tester.runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
