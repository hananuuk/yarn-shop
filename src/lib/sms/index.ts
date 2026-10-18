// SMS delivery for login codes. Swap the provider without touching the login flow.
export interface SmsProvider {
  readonly name: string;
  /** True when codes are not really sent (development). The login page then shows the code. */
  readonly showsCodeOnScreen: boolean;
  send(phone: string, message: string): Promise<void>;
}

class ConsoleSms implements SmsProvider {
  readonly name = "console";
  readonly showsCodeOnScreen = true;
  async send(phone: string, message: string) {
    console.log(`[sms:console] to ${phone}: ${message}`);
  }
}

// To add a real provider (e.g. a Mongolian SMS gateway), implement SmsProvider
// in a new file and return it below when SMS_PROVIDER matches its name.
export function getSms(): SmsProvider {
  const name = process.env.SMS_PROVIDER || "console";
  switch (name) {
    case "console":
      return new ConsoleSms();
    default:
      throw new Error(`Unknown SMS_PROVIDER "${name}". Implement it in src/lib/sms/index.ts.`);
  }
}
