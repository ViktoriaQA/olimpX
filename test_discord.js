const axios = require('axios');

async function testDiscordAuth() {
  try {
    console.log('🧪 Testing Discord OAuth endpoint...');
    
    const response = await axios.get('http://localhost:8080/auth/discord/login');
    
    console.log('✅ Discord auth endpoint working!');
    console.log('📝 Response:', response.data);
    console.log('🔗 Auth URL:', response.data.auth_url);
    
    // Check if URL contains required parameters
    const authUrl = response.data.auth_url;
    if (authUrl.includes('discord.com/api/oauth2/authorize') && 
        authUrl.includes('client_id') && 
        authUrl.includes('redirect_uri')) {
      console.log('✅ Discord auth URL is properly formatted');
    } else {
      console.log('❌ Discord auth URL format is incorrect');
    }
    
  } catch (error) {
    console.error('❌ Error testing Discord auth:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

testDiscordAuth();
