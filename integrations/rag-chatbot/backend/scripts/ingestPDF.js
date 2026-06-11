const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { pipeline } = require('@xenova/transformers');
const { ChromaClient } = require('chromadb');

async function ingestPDF() {
  try {
    // Get PDF path from command line
    const pdfPath = process.argv[2];
    
    if (!pdfPath) {
      console.error('Please provide a PDF file path');
      console.log('Usage: node scripts/ingestPDF.js <path-to-pdf>');
      process.exit(1);
    }

    if (!fs.existsSync(pdfPath)) {
      console.error(`Error: File not found: ${pdfPath}`);
      process.exit(1);
    }

    console.log(`\nReading PDF: ${pdfPath}`);
    
    // Parse the PDF and extract all text
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text;
    
    console.log(`Extracted ${text.length} characters from PDF`);
    
    // Split text into chunks
    const rawChunks = text.split('\n\n');
    const chunks = rawChunks
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length >= 50);
    
    console.log(`Created ${chunks.length} chunks (filtered from ${rawChunks.length} raw chunks)`);
    
    if (chunks.length === 0) {
      console.error('Error: No valid chunks found (all chunks < 50 characters)');
      process.exit(1);
    }
    
    // Load the embedding model
    console.log('\nLoading embedding model: Xenova/all-MiniLM-L6-v2...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Model loaded successfully!');
    
    // Generate embeddings for all chunks
    console.log('\nGenerating embeddings...');
    const embeddings = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1} of ${chunks.length}...`);
      const output = await extractor(chunks[i], { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      embeddings.push(embedding);
    }
    
    console.log('All embeddings generated!');
    
    // Connect to ChromaDB
    console.log('\nConnecting to ChromaDB at localhost:8000...');
    const client = new ChromaClient({ path: 'http://localhost:8000' });
    
    // Delete the collection if it already exists (fresh start)
    try {
      await client.deleteCollection({ name: 'safarx_kb' });
      console.log('Deleted existing safarx_kb collection');
    } catch (error) {
      // Collection doesn't exist, that's okay
      console.log('No existing collection to delete');
    }
    
    // Create a new collection
    console.log('Creating new collection: safarx_kb');
    const collection = await client.createCollection({ name: 'safarx_kb' });
    
    // Prepare data for insertion
    const ids = chunks.map((_, i) => `chunk_${i}`);
    const metadatas = chunks.map((chunk, i) => ({
      source: path.basename(pdfPath),
      chunk_index: i,
      length: chunk.length
    }));
    
    // Add all chunks in a single call
    console.log('\nAdding documents to ChromaDB...');
    await collection.add({
      ids: ids,
      embeddings: embeddings,
      documents: chunks,
      metadatas: metadatas
    });
    
    console.log('\n✓ Success!');
    console.log(`Done! ${chunks.length} chunks added to safarx_kb`);
    console.log(`Collection: safarx_kb`);
    console.log(`Source: ${path.basename(pdfPath)}`);
    
  } catch (error) {
    console.error('\n✗ Error during PDF ingestion:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the ingestion
ingestPDF();
