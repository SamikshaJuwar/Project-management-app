import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Manually load .env since dotenv might not be installed
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach(line => {
        const [key, ...value] = line.split("=");
        if (key && value.length > 0) {
            process.env[key.trim()] = value.join("=").trim().replace(/(^"|"$)/g, "");
        }
    });
}

const prisma = new PrismaClient();
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error("Invalid or missing ENCRYPTION_KEY environment variable. Must be 32 bytes (64 hex characters).");
    }
    return key;
}

function encrypt(text: string): string {
    if (!text) return text;
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function isEncrypted(text: string): boolean {
    return text.split(":").length === 3;
}

async function main() {
    console.log("Starting migration of existing GitHub PATs...");

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { githubToken: { not: null } },
                { githubToken2: { not: null } }
            ]
        }
    });

    let migrated = 0;

    for (const user of users) {
        let needsUpdate = false;
        const updateData: any = {};

        if (user.githubToken && !isEncrypted(user.githubToken)) {
            updateData.githubToken = encrypt(user.githubToken);
            needsUpdate = true;
        }

        if (user.githubToken2 && !isEncrypted(user.githubToken2)) {
            updateData.githubToken2 = encrypt(user.githubToken2);
            needsUpdate = true;
        }

        if (needsUpdate) {
            await prisma.user.update({
                where: { id: user.id },
                data: updateData
            });
            migrated++;
            console.log(`Migrated tokens for user: ${user.email}`);
        }
    }

    console.log(`Migration complete! Successfully migrated ${migrated} users' tokens to encrypted format.`);
}

main()
    .catch(e => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
