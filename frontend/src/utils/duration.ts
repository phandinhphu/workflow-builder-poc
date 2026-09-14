const UNIT_TO_ISO: Record<string, (amount: number) => string> = {
  SECOND: amount => `PT${amount}S`,
  SECONDS: amount => `PT${amount}S`,
  MINUTE: amount => `PT${amount}M`,
  MINUTES: amount => `PT${amount}M`,
  HOUR: amount => `PT${amount}H`,
  HOURS: amount => `PT${amount}H`,
  WORK_HOURS: amount => `PT${amount}H`,
  DAY: amount => `P${amount}D`,
  DAYS: amount => `P${amount}D`,
  BUSINESS_DAYS: amount => `P${amount}D`,
  WEEK: amount => `P${amount * 7}D`,
  WEEKS: amount => `P${amount * 7}D`,
};

/** Convert the designer's human-friendly duration into the ISO-8601 API contract. */
export function toIsoDuration(value: unknown, unit?: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value).trim())) {
    const amount = Number(value);
    const converter = UNIT_TO_ISO[String(unit ?? 'HOURS').toUpperCase()];
    return Number.isFinite(amount) && amount > 0 && converter ? converter(amount) : undefined;
  }

  const text = String(value).trim();
  if (/^P(?=\d|T)/i.test(text)) return text.toUpperCase();
  const match = text.match(/^(\d+)\s*(giây|second(?:s)?|phút|minute(?:s)?|giờ|hour(?:s)?|ngày|day(?:s)?|tuần|week(?:s)?)$/i);
  if (!match) return undefined;
  const vietnameseUnits: Record<string, string> = { 'giây': 'SECONDS', 'phút': 'MINUTES', 'giờ': 'HOURS', 'ngày': 'DAYS', 'tuần': 'WEEKS' };
  const normalizedUnit = vietnameseUnits[match[2].toLowerCase()] ?? match[2].toUpperCase().replace(/S?$/, 'S');
  return UNIT_TO_ISO[normalizedUnit]?.(Number(match[1]));
}

export function normalizeNodeDurations(type: string, rawConfig: Record<string, unknown>): Record<string, unknown> {
  const config = { ...rawConfig };
  if (['APPROVAL', 'REVIEW', 'ASSIGNMENT'].includes(type)) {
    const due = toIsoDuration(config.slaDue);
    if (due) config.slaDue = due;
    if (config.slaConfig && typeof config.slaConfig === 'object') {
      const sla = { ...(config.slaConfig as Record<string, unknown>) };
      const nestedDue = toIsoDuration(sla.dueIn ?? sla.dueDuration, sla.durationUnit);
      if (nestedDue) sla.dueIn = nestedDue;
      config.slaConfig = sla;
    }
  }
  if (type === 'TIMER') {
    const duration = toIsoDuration(config.duration ?? config.waitFor, config.durationUnit);
    if (duration) config.duration = duration;
  }
  if (type === 'WAIT_EVENT') {
    const timeout = toIsoDuration(config.timeout, config.timeoutUnit);
    if (timeout) config.timeout = timeout;
  }
  return config;
}
