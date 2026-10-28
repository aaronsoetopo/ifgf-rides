"use client";

import { useState } from "react";
import { Icon } from "./icon";

function smsHref(phones: string[], body: string) {
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const encoded = encodeURIComponent(body);
  // iOS and Android disagree on the multi-recipient sms: format.
  return isApple
    ? `sms://open?addresses=${phones.join(",")}&body=${encoded}`
    : `sms:${phones.join(",")}?body=${encoded}`;
}

export function ContactButtons({ phone, name }: { phone: string; name: string }) {
  return (
    <div className="flex gap-2">
      <a href={`tel:${phone}`} className="btn-outline flex-1 py-2" aria-label={`Call ${name}`}>
        <Icon name="phone" className="size-4" /> Call
      </a>
      <a href={`sms:${phone}`} className="btn-outline flex-1 py-2" aria-label={`Text ${name}`}>
        <Icon name="message" className="size-4" /> Text
      </a>
    </div>
  );
}

/** Opens the phone's messaging app with everyone in the car as recipients, plus a copy fallback. */
export function GroupText({ phones, message }: { phones: string[]; message: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(phones.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="btn-accent flex-1"
        onClick={() => (window.location.href = smsHref(phones, message))}
      >
        <Icon name="message" /> Group text everyone
      </button>
      <button type="button" className="btn-outline" onClick={copy} title="Copy all phone numbers">
        <Icon name={copied ? "check" : "copy"} />
        {copied ? "Copied" : "Numbers"}
      </button>
    </div>
  );
}
