/**
 * Validates required environment variables
 * Exits process if any required variables are missing
 */

const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET'
];

function validateEnv() {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        // In serverless / Vercel env: warn only, do not exit
        if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
        return;
    }
    
    console.log('✅ All required environment variables are set');
}

module.exports = validateEnv;
