import { z } from 'zod';

export const CardSchema = z.object({
    id: z.string(),
    mtgaId: z.number(),
    name: z.string(),
    set: z.string(),
    collectorNumber: z.string(),
    imageUri: z.string().url(),
    oracleId: z.string()
});
