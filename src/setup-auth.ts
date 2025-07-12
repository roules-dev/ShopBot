import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/config.json';
import fs from 'fs';
import { PrettyLog } from './utils/pretty-log';

const configFile = 'config/config.json';

if (!config.jwtSecret) {
    PrettyLog.info('No secret key found in config file. Generating a new one...');

    const newSecretKey = crypto.randomBytes(16).toString('hex');

    config.jwtSecret = newSecretKey;

    fs.writeFileSync(configFile, JSON.stringify(config, null, 4));

    PrettyLog.success(`New API token generated and saved to ${configFile}`);
}
else {
    PrettyLog.info('API token already exists in config file at path: ' + configFile);
}

const userId = process.argv[2]
if (!userId || userId === '') {
    PrettyLog.error('No user ID provided. Please provide a user ID as the first argument.')
    process.exit(1)
}

const adminData = {
    userId
};

const token = jwt.sign(adminData, config.jwtSecret, { algorithm: 'HS256' });

PrettyLog.success(`Generated API token for user ${userId}: ${token}\n\nYou can now use this token to make requests to the API. \nMake sure to include it in the Authorization header of your requests. Example: Authorization: Bearer ${token}`);