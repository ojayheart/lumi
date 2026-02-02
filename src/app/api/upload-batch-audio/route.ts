import { NextResponse } from 'next/server';
import { compressAudio } from '@/lib/audio-compression';

// Using Next.js 13+ API config approach
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const attachmentId = formData.get('attachmentId') as string;
    const batchId = formData.get('batchId') as string;
    const retreatLeaderName = formData.get('retreatLeaderName') as string || 'Interviewer';
    const recordType = formData.get('recordType') as string;

    if (!audioFile || !attachmentId || !batchId) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Check if webhook URL is configured
    const webhookUrl = process.env.GUEST_PROFILE_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL not configured' }, 
        { status: 500 }
      );
    }

    // Extract guest name from filename (format: guestName.extension)
    const guestName = audioFile.name.replace(/\.[^/.]+$/, "");
    
    console.log(`Processing audio file for guest: ${guestName}`);
    console.log(`Original file size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`);

    // Compress audio before sending
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const { compressedBuffer, originalSize, compressedSize, compressionRatio } = await compressAudio(audioBuffer, audioFile.name);
    
    console.log(`Compressed: ${(originalSize / 1024 / 1024).toFixed(2)} MB -> ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% reduction)`);

    // Create a new File object from the compressed buffer
    const compressedFile = new File(
      [new Uint8Array(compressedBuffer)], 
      guestName + '.mp3',
      { type: 'audio/mpeg' }
    );

    // Send to webhook
    await sendToWebhook({
      webhookUrl,
      audioFile: compressedFile,
      guestName,
      attachmentId,
      batchId,
      retreatLeaderName,
      recordType
    });

    return NextResponse.json({ 
      success: true,
      message: 'File uploaded and sent to webhook successfully',
      guestName,
      batchId
    });
  } catch (error) {
    console.error('Error uploading to webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send to webhook' }, 
      { status: 500 }
    );
  }
}

async function sendToWebhook({
  webhookUrl,
  audioFile,
  guestName,
  attachmentId,
  batchId,
  retreatLeaderName,
  recordType
}: {
  webhookUrl: string;
  audioFile: File;
  guestName: string;
  attachmentId: string;
  batchId: string;
  retreatLeaderName: string;
  recordType: string;
}) {
  try {
    // Create FormData to send to webhook
    const webhookFormData = new FormData();
    
    // Add audio file
    webhookFormData.append('audio', audioFile);
    
    // Add metadata
    webhookFormData.append('guestName', guestName);
    webhookFormData.append('attachmentId', attachmentId);
    webhookFormData.append('batchId', batchId);
    webhookFormData.append('retreatLeaderName', retreatLeaderName);
    webhookFormData.append('recordType', recordType);
    webhookFormData.append('timestamp', new Date().toISOString());

    console.log('Sending audio file to webhook');
    console.log(`Metadata: ${JSON.stringify({ guestName, batchId, retreatLeaderName, recordType })}`);

    // Send to webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: webhookFormData,
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text().catch(() => 'Unknown error');
      throw new Error(`Webhook returned ${webhookResponse.status}: ${errorText}`);
    }

    const responseText = await webhookResponse.text();
    console.log(`Webhook response: ${responseText}`);

    return {
      success: true,
      webhookResponse: responseText
    };
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Provide more specific error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to webhook URL. Please check the URL and network connectivity.');
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Webhook request timed out after 30 seconds');
    }
    
    throw error;
  }
}