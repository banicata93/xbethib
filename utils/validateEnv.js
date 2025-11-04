/**
 * Validates required environment variables
 * Exits process if any required variables are missing
 */

const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NODE_ENV'
];

function validateEnv() {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('❌ CRITICAL ERROR: Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\nPlease set these variables in your .env file or environment.');
        process.exit(1);
    }
    
    console.log('✅ All required environment variables are set');
}

module.exports = validateEnv;
