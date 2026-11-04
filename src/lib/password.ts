
import {
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(
    password: string,
): Promise<string> {
    const salt = randomBytes(16).toString("hex");

    const key = (await scrypt(
        password,
        salt,
        KEY_LENGTH,
    )) as Buffer;

    return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {
    const [salt, keyHex] = storedHash.split(":");

    if (!salt || !keyHex || !/^[a-f0-9]+$/i.test(keyHex)) {
        return false;
    }

    const expectedKey = Buffer.from(keyHex, "hex");

    if (expectedKey.length !== KEY_LENGTH) {
        return false;
    }

    const derivedKey = (await scrypt(
        password,
        salt,
        KEY_LENGTH,
    )) as Buffer;

    return timingSafeEqual(derivedKey, expectedKey);
}
