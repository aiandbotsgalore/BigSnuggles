# Getting Your Google AI API Key

## Quick Guide

To use the voice interface features of Big Snuggles, you need a Google AI API key.

### Step-by-Step Instructions

1. **Visit Google AI Studio**
   - Go to https://aistudio.google.com/app/apikey
   - Sign in with your Google account

2. **Create API Key**
   - Click "Get API key" or "Create API key"
   - Choose "Create API key in new project" (or select existing project)
   - Copy the generated API key immediately

3. **Add to Environment**
   - Open `/workspace/big-snuggles/backend/.env`
   - Find the line: `GOOGLE_AI_API_KEY=`
   - Paste your key: `GOOGLE_AI_API_KEY=your_actual_key_here`
   - Save the file

4. **Restart Backend Server**
   ```bash
   cd /workspace/big-snuggles/backend
   # Stop the current server (Ctrl+C)
   pnpm run dev
   ```

5. **Test Voice Interface**
   - Navigate to http://localhost:5173/chat
   - Click "Start Voice Session"
   - Grant microphone permissions
   - Click "Start Speaking" and talk to Big Snuggles!

## API Key Security

- **Never commit** your API key to version control
- **Keep it private** - don't share it publicly
- **Regenerate if exposed** - you can always create a new key
- The `.env` file is in `.gitignore` for safety

## Free Tier Limits

Google AI Studio provides a generous free tier:
- 60 requests per minute
- 1,500 requests per day
- Perfect for development and testing

## Troubleshooting

### "Invalid API key" error
- Verify you copied the entire key (no spaces)
- Check the key is active in Google AI Studio
- Ensure no quotes around the key in .env file

### "Quota exceeded" error
- You've hit the free tier limit
- Wait a few minutes for quota to reset
- Or upgrade to a paid plan for higher limits

### Voice not working after adding key
- Restart the backend server
- Check backend console for errors
- Verify the key is in the correct .env file

## Alternative: Using Existing Key

If you already have a Google AI API key:
1. Just paste it into `backend/.env`
2. Restart the server
3. Ready to go!

## Cost Estimate

For typical usage:
- **Free tier**: Sufficient for personal use and testing
- **Paid tier**: Around $0.000125 per 1K characters input
- A typical 5-minute conversation: < $0.01

## Next Steps

Once your API key is configured:
1. Start a voice session
2. Test different personality modes
3. Check latency metrics
4. Try the text fallback mode
5. Explore all 5 personality modes

## Support

If you encounter issues:
- Check the backend console for detailed error messages
- Verify the API key is active in Google AI Studio
- See `/docs/PHASE3_VOICE_INTERFACE.md` for full troubleshooting guide
