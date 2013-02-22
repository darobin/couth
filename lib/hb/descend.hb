{{#each fields}}
  {{#if isHidden}}
    {{> hidden}}
  {{else}}
    <div class='control-group'>
      {{> dispatch}}
    </div>
  {{/if}}
{{/each}}
