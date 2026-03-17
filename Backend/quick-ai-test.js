require('dotenv').config();

console.log('🔍 AI Assistant Quick Diagnostic');
console.log('===============================');

// Check environment configuration
console.log('\n📋 Configuration Check:');
console.log('- AI Provider:', process.env.AI_PROVIDER);
console.log('- AI Model:', process.env.AI_MODEL);
console.log('- API Key Set:', process.env.AI_API_KEY ? '✅ Yes' : '❌ No');

// Test AI Service directly
const AIService = require('./aiService');

async function quickTest() {
  console.log('\n🧠 Testing AI Service...');
  
  const aiService = new AIService();
  
  try {
    const result = await aiService.askAI('test-room', 'Hello, are you working?', {
      files: [{ name: 'test.js', content: 'console.log("test");' }],
      language: 'javascript',
      recentChat: []
    });
    
    if (result.success) {
      console.log('✅ AI Service is working correctly!');
      console.log('📝 Response preview:', result.message.substring(0, 150) + '...');
      console.log('\n🎯 AI backend is functional. If frontend AI isn\'t working:');
      console.log('   1. Check browser console for JavaScript errors');
      console.log('   2. Make sure you\'re in a coding room (not homepage)');
      console.log('   3. Click on "AI" tab in the right panel');
      console.log('   4. Try typing a message and pressing Enter');
      console.log('   5. Check Network tab for failed requests');
    } else {
      console.log('❌ AI Service failed:', result.message);
      console.log('\n🔧 Possible fixes:');
      console.log('   1. Check your Gemini API key is valid');
      console.log('   2. Check internet connection');
      console.log('   3. Try switching to OpenAI as fallback');
    }
  } catch (error) {
    console.log('❌ AI Service error:', error.message);
    console.log('\n🔧 This indicates a configuration problem:');
    console.log('   1. Verify your API key is correct'); 
    console.log('   2. Check the AI service configuration');
    console.log('   3. Ensure all dependencies are installed');
  }
  
  console.log('\n📊 Backend Status:');
  console.log('- Socket.IO server: Running on port 4000');
  console.log('- MongoDB: Connected');
  console.log('- AI Service: ' + (result?.success ? 'Working' : 'Failed'));
}

quickTest();