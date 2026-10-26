export const INITIAL_REBIRTHS=3,MAX_REBIRTHS=11;
export const validRebirthReward=id=>typeof id==='string'&&/^[1-8]-1$/.test(id);
export function rebirthClaims(values=[]){return [...new Set(Array.isArray(values)?values.filter(validRebirthReward):[])];}
