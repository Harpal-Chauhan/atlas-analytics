
import {
    createHash,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export const createApiKey = (): string => {
    return `atlas_${randomBytes(32).toString("hex")}`;
};

export const hashApiKey = async (
    apiKey: string,
): Promise<string> => {
    const salt = randomBytes(16).toString("hex");

    const derivedKey = (await scrypt(
        apiKey,
        salt,
        KEY_LENGTH,
    )) as Buffer;

    return `${salt}:${derivedKey.toString("hex")}`;
};

export const createApiKeyLookupHash = (
    apiKey: string,
): string => {
    return createHash("sha256")
        .update(apiKey, "utf8")
        .digest("hex");
};

export const verifyApiKey = async (
    apiKey: string,
    storedHash: string,
): Promise<boolean> => {
    const [salt, keyHex] = storedHash.split(":");

    if (
        !salt ||
        !keyHex ||
        !/^[a-f0-9]{128}$/i.test(keyHex)
    ) {
        return false;
    }

    const expectedKey = Buffer.from(keyHex, "hex");

    const derivedKey = (await scrypt(
        apiKey,
        salt,
        KEY_LENGTH,
    )) as Buffer;

    return timingSafeEqual(derivedKey, expectedKey);
};
