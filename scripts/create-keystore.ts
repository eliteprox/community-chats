import { createKeystore } from './utils/keystore';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🔐 Keystore Creation Tool');
  console.log('========================\n');

  const privateKey = await question('Enter your private key (with 0x prefix): ');
  
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('Invalid private key format. Must be 0x followed by 64 hex characters.');
  }

  const password = await question('Enter a strong password: ');
  const confirmPassword = await question('Confirm password: ');

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match!');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const outputPath = await question('Output path (default: ./keystore.json): ');
  const finalPath = outputPath || './keystore.json';

  await createKeystore(privateKey, password, finalPath);

  console.log('\n✅ Keystore created successfully!');
  console.log('\n📝 To use for deployments, add to .env:');
  console.log(`KEYSTORE_PATH=${finalPath}`);
  console.log(`KEYSTORE_PASSWORD=your_password_here`);
  console.log('\n⚠️  IMPORTANT: Keep your keystore and password secure!');
  console.log('   Add keystore.json to .gitignore (already configured)');

  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  });

