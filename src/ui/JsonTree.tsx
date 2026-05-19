import type { ReactNode } from "react";
import { tryDecodeBase64Text } from "../lib/text/base64";
import {
  parseJsonText,
  stringifyJsonPrimitive,
  stringifyJsonValue,
} from "../lib/text/json";

type Base64DecodeResult = {
  text: string;
  json: unknown | null;
  isJson: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeBase64Value(value: string): Base64DecodeResult | null {
  const text = tryDecodeBase64Text(value, {
    minLength: 16,
    requireMostlyPrintable: true,
  });

  if (!text) {
    return null;
  }

  const parsedJson = parseJsonText(text);
  return parsedJson.ok
    ? {
        text,
        json: parsedJson.value,
        isJson: true,
      }
    : {
        text,
        json: null,
        isJson: false,
      };
}

export function JsonTree({
  value,
  path,
  decodedBase64,
  onToggleBase64,
  decodeLabel,
  rawLabel,
}: {
  value: unknown;
  path: string;
  decodedBase64: Record<string, boolean>;
  onToggleBase64: (path: string) => void;
  decodeLabel: string;
  rawLabel: string;
}): ReactNode {
  if (Array.isArray(value)) {
    return (
      <div className="json-tree json-tree--array">
        <span className="json-tree__bracket">[</span>
        <div className="json-tree__children">
          {value.map((item, index) => (
            <div className="json-tree__row" key={`${path}.${index}`}>
              <span className="json-tree__key">{index}</span>
              <JsonTree
                value={item}
                path={`${path}.${index}`}
                decodedBase64={decodedBase64}
                onToggleBase64={onToggleBase64}
                decodeLabel={decodeLabel}
                rawLabel={rawLabel}
              />
            </div>
          ))}
        </div>
        <span className="json-tree__bracket">]</span>
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <div className="json-tree json-tree--object">
        <span className="json-tree__bracket">{"{"}</span>
        <div className="json-tree__children">
          {Object.entries(value).map(([key, item]) => (
            <div className="json-tree__row" key={`${path}.${key}`}>
              <span className="json-tree__key">{key}</span>
              <JsonTree
                value={item}
                path={`${path}.${key}`}
                decodedBase64={decodedBase64}
                onToggleBase64={onToggleBase64}
                decodeLabel={decodeLabel}
                rawLabel={rawLabel}
              />
            </div>
          ))}
        </div>
        <span className="json-tree__bracket">{"}"}</span>
      </div>
    );
  }

  if (typeof value === "string") {
    const base64Value = decodeBase64Value(value);
    const isDecoded = Boolean(decodedBase64[path]);
    const displayValue =
      isDecoded && base64Value
        ? base64Value.isJson
          ? stringifyJsonValue(base64Value.json, 2)
          : base64Value.text
        : stringifyJsonValue(value);

    return (
      <span className="json-tree__value-wrap">
        <span className="json-tree__value json-tree__value--string">
          {displayValue}
        </span>
        {base64Value ? (
          <button
            type="button"
            className={`json-tree__base64-toggle${
              isDecoded ? " json-tree__base64-toggle--active" : ""
            }`}
            onClick={() => onToggleBase64(path)}
          >
            {isDecoded ? rawLabel : decodeLabel}
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <span className={`json-tree__value json-tree__value--${typeof value}`}>
      {stringifyJsonPrimitive(value)}
    </span>
  );
}
