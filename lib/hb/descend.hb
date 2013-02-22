{{#each fields}}
  <div{{#unless isHidden }} class='control-group'{{/unless}}>
    {{> dispatch}}
  </div>
{{/each}}
