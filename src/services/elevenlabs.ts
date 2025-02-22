import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export class ElevenLabsService {
  private apiKey: string;

  constructor() {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key is not configured');
    }
    this.apiKey = ELEVENLABS_API_KEY;
  }

  async textToSpeech(text: string, voiceId: string = 'default'): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error in text-to-speech conversion:', error);
      throw new Error('Failed to convert text to speech');
    }
  }

  async handleConversation(
    userInput: string,
    doctorInfo: any,
    availableSlots: any[]
  ): Promise<{
    response: string;
    audioBuffer: Buffer;
    selectedSlot?: any;
  }> {
    // TODO: Implement conversation logic
    const response = `Hello! I'm the AI receptionist for ${doctorInfo.name}. 
                     How can I help you schedule an appointment?`;

    try {
      const audioBuffer = await this.textToSpeech(response);
      return {
        response,
        audioBuffer,
      };
    } catch (error) {
      console.error('Error in conversation handling:', error);
      throw new Error('Failed to handle conversation');
    }
  }
}

export default new ElevenLabsService(); 