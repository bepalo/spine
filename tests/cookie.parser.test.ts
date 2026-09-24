// tests/cookie.parser.test.ts

import { describe, it, expect } from "bun:test";

import { parseCookie, parseCookieFromRequest } from "../src/parsers";

const request = (cookie?: string): Request =>
  ({
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "cookie" && cookie != null ? cookie : undefined,
    },
  }) as any;

const expectCookieError = (cookie: string, message: string) => {
  expect(() => parseCookieFromRequest(request(cookie))).toThrow(message);
};

describe("parseCookieFromRequest", () => {
  describe("missing / empty headers", () => {
    it("returns undefined when the Cookie header is absent", () => {
      expect(parseCookieFromRequest(request())).toBeUndefined();
    });

    it("rejects an empty Cookie header", () => {
      expectCookieError("", "Invalid cookie");
    });
  });

  describe("basic cookie pairs", () => {
    it("parses a cookie with an empty value", () => {
      expect(parseCookieFromRequest(request("abc="))).toEqual({
        abc: "",
      });
    });

    it("parses a cookie with a value", () => {
      expect(parseCookieFromRequest(request("abc=123"))).toEqual({
        abc: "123",
      });
    });

    it("parses multiple cookies", () => {
      expect(parseCookieFromRequest(request("abc=123; def=456"))).toEqual({
        abc: "123",
        def: "456",
      });
    });

    it("parses multiple cookies with empty values", () => {
      expect(parseCookieFromRequest(request("abc=; def="))).toEqual({
        abc: "",
        def: "",
      });
    });

    it("preserves the original cookie value", () => {
      expect(parseCookieFromRequest(request("token=%2Ffoo%3Dbar"))).toEqual({
        token: "%2Ffoo%3Dbar",
      });
    });

    it("does not URL-decode values", () => {
      expect(parseCookieFromRequest(request("token=hello%20world"))).toEqual({
        token: "hello%20world",
      });
    });

    it("allows equals signs inside cookie values", () => {
      expect(parseCookieFromRequest(request("a=b=c"))).toEqual({
        a: "b=c",
      });

      expect(parseCookieFromRequest(request("a=abc=="))).toEqual({
        a: "abc==",
      });

      expect(parseCookieFromRequest(request("a=base64=="))).toEqual({
        a: "base64==",
      });
    });

    it("uses the last value for duplicate cookie names", () => {
      expect(
        parseCookieFromRequest(request("session=first; session=second")),
      ).toEqual({
        session: "second",
      });
    });
  });

  describe("cookie-name", () => {
    it("rejects a missing cookie name", () => {
      expectCookieError("=", "Invalid cookie-name token");
    });

    it("rejects a quoted cookie name", () => {
      expectCookieError('""=a', "Invalid cookie-name token");
    });

    it("rejects comma in a cookie name", () => {
      expectCookieError("ab,c=1", "Invalid cookie-name token");
    });

    it("rejects backslash in a cookie name", () => {
      expectCookieError(String.raw`ab\c=1`, "Invalid cookie-name token");
    });

    it("rejects double quotes in a cookie name", () => {
      expectCookieError('ab"c=1', "Invalid cookie-name token");
    });

    it("rejects HTTP separator characters in a cookie name", () => {
      const separators = "()<>@,:/[]?{}";

      for (const separator of separators) {
        expectCookieError(`ab${separator}c=1`, "Invalid cookie-name token");
      }
    });

    it("accepts valid token punctuation in cookie names", () => {
      expect(parseCookieFromRequest(request("!#$%&'*+-.^_`|~=value"))).toEqual({
        "!#$%&'*+-.^_`|~": "value",
      });
    });

    it("accepts digits and letters in cookie names", () => {
      expect(parseCookieFromRequest(request("a0Z9=value"))).toEqual({
        a0Z9: "value",
      });
    });
  });

  describe("cookie-value", () => {
    it("accepts an empty unquoted value", () => {
      expect(parseCookieFromRequest(request("a="))).toEqual({
        a: "",
      });
    });

    it("accepts RFC cookie-octet characters", () => {
      const value = "!#$%&'()*+-./:<>?@[]^_`{|}~0123ABCxyz=";

      expect(parseCookieFromRequest(request(`a=${value}`))).toEqual({
        a: value,
      });
    });

    it("rejects comma in an unquoted value", () => {
      expectCookieError("a=ab,cd", "Invalid cookie-value token");
    });

    it("rejects backslash in an unquoted value", () => {
      expectCookieError(String.raw`a=ab\cd`, "Invalid cookie-value token");
    });

    it("rejects whitespace in an unquoted value", () => {
      expectCookieError("a=hello world", "Invalid cookie-value token");
    });

    it("rejects carriage return in a value", () => {
      expectCookieError("a=hello\rworld", "Invalid cookie-value token");
    });

    it("rejects line feed in a value", () => {
      expectCookieError("a=hello\nworld", "Invalid cookie-value token");
    });

    it("rejects tab in a value", () => {
      expectCookieError("a=hello\tworld", "Invalid cookie-value token");
    });
  });

  describe("double-quoted cookie values", () => {
    it("accepts an empty quoted value", () => {
      expect(parseCookieFromRequest(request('a=""'))).toEqual({
        a: '""',
      });
    });

    it("accepts a quoted value", () => {
      expect(parseCookieFromRequest(request('a="123"'))).toEqual({
        a: '"123"',
      });
    });

    it("preserves the surrounding double quotes", () => {
      expect(parseCookieFromRequest(request('a="hello%20world"'))).toEqual({
        a: '"hello%20world"',
      });
    });

    it("rejects whitespace inside a quoted value", () => {
      expectCookieError('a="hello world"', "Invalid cookie-value token");
    });

    it("rejects semicolon inside a quoted value", () => {
      expectCookieError('a="12;3"', "Invalid double-quoted cookie-value token");
    });

    it("rejects semicolon followed by space inside a quoted value", () => {
      expectCookieError(
        'a="12; 3"',
        "Invalid double-quoted cookie-value token",
      );
    });

    it("rejects an unterminated quoted value", () => {
      expectCookieError('a="12; 3', "Invalid double-quoted cookie-value token");

      expectCookieError('a="', "Invalid double-quoted cookie-value token");
    });

    it("rejects content after the closing quote", () => {
      expectCookieError('a="12"3"', "Invalid cookie-value token");
    });

    it("rejects comma inside a quoted value", () => {
      expectCookieError(
        'a="ab,cd"',
        "Invalid double-quoted cookie-value token",
      );
    });

    it("rejects backslash inside a quoted value", () => {
      expectCookieError(
        String.raw`a="ab\cd"`,
        "Invalid double-quoted cookie-value token",
      );
    });
  });

  describe("cookie separators", () => {
    it("requires a semicolon followed by exactly one SP", () => {
      expect(parseCookieFromRequest(request("a=1; b=2"))).toEqual({
        a: "1",
        b: "2",
      });
    });

    it("rejects a trailing semicolon", () => {
      expectCookieError("a=1;", "Invalid cookie-separator token");
    });

    it("rejects a semicolon without SP", () => {
      expectCookieError("a=1;b=2", "Invalid cookie-separator token");
    });

    it("rejects multiple spaces after semicolon", () => {
      expectCookieError("a=1;  b=2", "Invalid cookie-name token");
    });

    it("rejects a tab after semicolon", () => {
      expectCookieError("a=1;\tb=2", "Invalid cookie-separator token");
    });

    it("rejects a second cookie without a value", () => {
      expectCookieError("a=1; b", "Invalid cookie");
    });
  });

  describe("malformed structure", () => {
    it("rejects a bare cookie name", () => {
      expectCookieError("abc", "Invalid cookie");
    });

    it("rejects a semicolon before a cookie pair", () => {
      expectCookieError("; abc=1", "Invalid cookie-name token");
    });

    it("rejects an empty cookie pair", () => {
      expectCookieError("; ", "Invalid cookie-name token");
    });

    it("rejects a double quote in the middle of an unquoted value", () => {
      expectCookieError('a=ab"cd', "Invalid cookie-value token");
    });

    it("rejects a second opening quote", () => {
      expectCookieError('a=""foo', "Invalid cookie-value token");
    });

    it("rejects malformed quoted values before a second cookie", () => {
      expectCookieError('a="foo"; b', "Invalid cookie");
    });
  });

  describe("cookieOut", () => {
    it("writes into the supplied object", () => {
      const cookieOut = {
        existing: "value",
      };

      const result = parseCookieFromRequest(
        request("session=abc; theme=dark"),
        cookieOut,
      );

      expect(result).toBe(cookieOut);
      expect(cookieOut).toEqual({
        existing: "value",
        session: "abc",
        theme: "dark",
      });
    });

    it("preserves existing properties", () => {
      const cookieOut = {
        session: "old",
        theme: "dark",
      };

      parseCookieFromRequest(request("session=new"), cookieOut);

      expect(cookieOut).toEqual({
        session: "new",
        theme: "dark",
      });
    });

    it("does not modify cookieOut when the Cookie header is absent", () => {
      const cookieOut = {
        session: "existing",
      };

      const result = parseCookieFromRequest(request(), cookieOut);

      expect(result).toBeUndefined();
      expect(cookieOut).toEqual({
        session: "existing",
      });
    });
  });
});

describe("parseCookie middleware", () => {
  it("creates ctx.cookie when it does not exist", () => {
    const handler = parseCookie();

    const ctx = {
      request: request("session=abc; theme=dark"),
    } as any;

    handler(ctx);

    expect(ctx.cookie).toEqual({
      session: "abc",
      theme: "dark",
    });
  });

  it("writes into an existing ctx.cookie object", () => {
    const handler = parseCookie();

    const cookie = {
      existing: "value",
    };

    const ctx = {
      request: request("session=abc"),
      cookie,
    } as any;

    handler(ctx);

    expect(ctx.cookie).toBe(cookie);
    expect(ctx.cookie).toEqual({
      existing: "value",
      session: "abc",
    });
  });

  it("leaves ctx.cookie initialized when the Cookie header is absent", () => {
    const handler = parseCookie();

    const ctx = {
      request: request(),
    } as any;

    handler(ctx);

    expect(ctx.cookie).toEqual({});
  });

  it("propagates malformed cookie errors", () => {
    const handler = parseCookie();

    const ctx = {
      request: request("session"),
    } as any;

    expect(() => handler(ctx)).toThrow("Invalid cookie");
  });
});
