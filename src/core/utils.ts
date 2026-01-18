import { createHash } from "crypto";

export const getHashString = (input: string): string => {
    const hash = createHash("sha256");
    hash.update(input);
    return hash.digest("hex");
};
