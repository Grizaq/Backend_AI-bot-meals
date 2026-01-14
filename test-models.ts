import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.models) {
      console.log('Available models that support generateContent:');
      for (const model of data.models) {
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`\n- ${model.name}`);
          console.log(`  Display name: ${model.displayName}`);
        }
      }
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listModels();