import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error("Invalid or missing ENCRYPTION_KEY environment variable. Must be 32 bytes (64 hex characters).");
    }
    return key;
}

export function encrypt(text: string): string {
    if (!text) return text;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string | null | undefined): string | null {
    if (!encryptedText) return encryptedText || null;

    const parts = encryptedText.split(":");
    // If not in the expected format (e.g. legacy plain text token), return as is for backward compatibility.
    // An encrypted payload uses iv:authTag:ciphertext format, so it has exactly 3 parts.
    if (parts.length !== 3) {
        return encryptedText;
    }

    try {
        const key = getEncryptionKey();
        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("Decryption failed. Returning original string as fallback.", error);
        // Fallback to returning original string for backward compatibility
        return encryptedText;
    }
}
