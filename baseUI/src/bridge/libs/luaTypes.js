export const Any = i => i
export const Integer = i => +i | 0
export const Optional = type => ({ type, optional: true })
