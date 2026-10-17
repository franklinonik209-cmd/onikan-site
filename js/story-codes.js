// Soft Life: Abuja Story Code decoder for onikanglobal.com.
// A faithful client-side port of the game's codec (Soft Life: Abuja,
// lib/core/story_code.dart, format version 1). Decoding happens
// entirely in the visitor's browser: nothing is sent anywhere,
// there is no server call, and no code is stored.
(function () {
  "use strict";

  var VERSION = 1;
  var PREFIX = "SLA1";
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  // Fixed vocabularies, in the game's code order. These strings are
  // the game's own published labels (content/endings.json titles and
  // verdicts, chapter titles, life path and ledger band labels).
  var ENDINGS = [
    { id: "money_low", title: "Broke in the Capital", verdict: "The money finished before the month did." },
    { id: "money_high", title: "Money Miss Road", verdict: "The money came, and sense quietly left." },
    { id: "influence_low", title: "Nobody Knows Your Name", verdict: "In this city, anonymity is just exile with good weather." },
    { id: "influence_high", title: "Too Connected to Breathe", verdict: "Everybody's person is nobody's own." },
    { id: "softLife_low", title: "Hard Life in Full", verdict: "You survived Abuja. You never lived in it." },
    { id: "softLife_high", title: "Soft Life Swallowed You", verdict: "The enjoyment was total. So was the bill." },
    { id: "wahala_low", title: "Too Quiet to Trust", verdict: "A life with zero wahala is a story nobody believes, including the city." },
    { id: "wahala_high", title: "Wahala Republic", verdict: "Trouble did not find you. You incorporated it." },
    { id: "legacy", title: "The Legacy", verdict: "You did not just live in Abuja. You became part of how it remembers itself." }
  ];

  var CHAPTERS = [
    "Chapter 1: Arrival",
    "Chapter 2: Hustle Politely",
    "Chapter 3: Connected"
  ];

  var LIFE_PATHS = [
    { id: "soft_life", label: "The Soft Life" },
    { id: "landlord", label: "The Landlord" },
    { id: "club_owner", label: "The Club Owner" },
    { id: "dealer", label: "The Dealer" },
    { id: "fixer", label: "The Fixer" },
    { id: "family", label: "The Family Legacy" }
  ];

  var BANDS = ["Stone quiet", "Holding back", "Balanced", "Open hand", "No gate at all"];

  function StoryCodeError(message) {
    this.message = message;
  }

  // CRC-8 (poly 0x07, init 0x00), exactly as the game computes it:
  // a copy-error and casual-tamper tripwire, not a signature.
  function checksum(bytes) {
    var crc = 0;
    for (var j = 0; j < bytes.length; j++) {
      crc ^= bytes[j];
      for (var i = 0; i < 8; i++) {
        crc = (crc & 0x80) !== 0 ? ((crc << 1) ^ 0x07) & 0xFF : (crc << 1) & 0xFF;
      }
    }
    return crc;
  }

  function base32Decode(body) {
    var bytes = [];
    var buffer = 0;
    var bits = 0;
    for (var n = 0; n < body.length; n++) {
      var value = ALPHABET.indexOf(body.charAt(n));
      if (value < 0) {
        throw new StoryCodeError("That code has characters a story code never uses.");
      }
      buffer = (buffer << 5) | value;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 0xFF);
        buffer &= (1 << bits) - 1;
      }
    }
    // The 65th bit is padding and must be zero.
    if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) {
      throw new StoryCodeError("That code does not check out.");
    }
    if (bytes.length !== 8) {
      throw new StoryCodeError("That code looks incomplete.");
    }
    return bytes;
  }

  // Decode a pasted code into the life it carries. Throws
  // StoryCodeError with a reader-safe message on any problem, in the
  // same order and words as the game's decoder.
  function decode(input) {
    if (input.length > 128) {
      throw new StoryCodeError("That is far longer than a story code.");
    }
    var cleaned = input.trim().toUpperCase().replace(/-/g, "").replace(/ /g, "");
    if (cleaned.length === 0) {
      throw new StoryCodeError("That code is empty. Paste the full code.");
    }
    if (cleaned.indexOf(PREFIX) !== 0) {
      throw new StoryCodeError("That is not a Soft Life story code.");
    }
    var body = cleaned.substring(PREFIX.length);
    if (body.length !== 13) {
      throw new StoryCodeError("That code looks incomplete. Paste the full code.");
    }
    var bytes = base32Decode(body);
    var payload = bytes.slice(0, 7);
    if (checksum(payload) !== bytes[7]) {
      throw new StoryCodeError("That code does not check out. It may have been typed wrong.");
    }
    var versionFound = payload[0] >> 4;
    if (versionFound !== VERSION) {
      throw new StoryCodeError("That code is from a newer version of the game.");
    }
    var endingIdx = payload[0] & 0x0F;
    if (endingIdx >= ENDINGS.length) {
      throw new StoryCodeError("That code names an ending we do not know.");
    }
    if ((payload[1] >> 4) !== 0) {
      throw new StoryCodeError("That code carries data we do not know.");
    }
    var mask = ((payload[1] & 0x01) << 8) | payload[2];
    if ((mask >> ENDINGS.length) !== 0) {
      throw new StoryCodeError("That code carries endings we do not know.");
    }
    var lifePathIdx = (payload[1] >> 1) & 0x07;
    if (lifePathIdx >= LIFE_PATHS.length) {
      throw new StoryCodeError("That code names a life we do not know.");
    }
    var generosityBand = payload[6] >> 4;
    var boundariesBand = payload[6] & 0x0F;
    if (generosityBand >= BANDS.length || boundariesBand >= BANDS.length) {
      throw new StoryCodeError("That code carries a family flavour we do not know.");
    }
    var endingsReached = [];
    for (var i = 0; i < ENDINGS.length; i++) {
      if ((mask & (1 << i)) !== 0) endingsReached.push(ENDINGS[i]);
    }
    return {
      ending: ENDINGS[endingIdx],
      endingsMask: mask,
      endingsReached: endingsReached,
      lifePath: LIFE_PATHS[lifePathIdx],
      chapterIndex: payload[3] & 0x0F,
      famousCount: payload[3] >> 4,
      softLifeIndex: (payload[4] << 8) | payload[5],
      generosityBand: BANDS[generosityBand],
      boundariesBand: BANDS[boundariesBand]
    };
  }

  function chapterTitle(chapterIndex) {
    if (chapterIndex >= 0 && chapterIndex < CHAPTERS.length) {
      return CHAPTERS[chapterIndex];
    }
    return "Chapter " + (chapterIndex + 1);
  }

  var api = {
    decode: decode,
    checksum: checksum,
    chapterTitle: chapterTitle,
    StoryCodeError: StoryCodeError
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  // Page wiring (browser only).
  if (typeof document === "undefined") return;

  var form = document.querySelector("[data-sc-form]");
  if (!form) return;
  var input = form.querySelector("[data-sc-input]");
  var errorBox = document.querySelector("[data-sc-error]");
  var card = document.querySelector("[data-sc-card]");

  function setText(selector, text) {
    var el = card.querySelector(selector);
    if (el) el.textContent = text;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    card.hidden = true;
  }

  function showCard(code, life) {
    setText("[data-sc-path]", life.lifePath.label);
    setText("[data-sc-ending]", life.ending.title);
    setText("[data-sc-verdict]", life.ending.verdict);
    setText("[data-sc-chapter]", chapterTitle(life.chapterIndex));
    setText("[data-sc-index]", String(life.softLifeIndex));
    setText("[data-sc-famous]", String(life.famousCount));
    setText("[data-sc-gen]", life.generosityBand);
    setText("[data-sc-bnd]", life.boundariesBand);
    setText("[data-sc-endcount]",
      life.endingsReached.length + " of " + ENDINGS.length);
    var titles = [];
    for (var i = 0; i < life.endingsReached.length; i++) {
      titles.push(life.endingsReached[i].title);
    }
    setText("[data-sc-endlist]", titles.join(" · "));
    setText("[data-sc-ghost]", String(life.softLifeIndex));
    setText("[data-sc-code]", code);
    errorBox.hidden = true;
    errorBox.textContent = "";
    card.hidden = false;
    if (card.scrollIntoView) {
      card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var raw = input.value;
    try {
      var life = decode(raw);
      var canonical = raw.trim().toUpperCase();
      showCard(canonical, life);
    } catch (e) {
      if (e instanceof StoryCodeError) {
        showError(e.message);
      } else {
        showError("That code could not be read. Check it and try again.");
      }
    }
  });

  var sample = document.querySelector("[data-sc-sample]");
  if (sample) {
    sample.addEventListener("click", function () {
      input.value = sample.getAttribute("data-sc-sample") || "";
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
  }
})();
