export function threadIdFromCode(code: string) {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return `lc_${clean.toLowerCase()}`;
}

