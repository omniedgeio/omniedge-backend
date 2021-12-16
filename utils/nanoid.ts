import { customAlphabet } from "nanoid";

const allowedAlphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const modelId = customAlphabet(allowedAlphabet, 20);

export const nanoid = (length: number) =>
  customAlphabet(allowedAlphabet, length)();
