{{#if isHidden    }}{{> hidden}}{{/if
}}{{#if isString  }}{{> string}}{{/if
}}{{#if isNumber  }}{{> number}}{{/if
}}{{#if isBoolean }}{{> boolean}}{{/if
}}{{#if isObject  }}{{> object}}{{/if
}}{{#if isUnion   }}{{> union}}{{/if
}}{{#if isArray   }}{{> array}}{{/if
}}{{#if isEnum    }}{{> enum}}{{/if}}