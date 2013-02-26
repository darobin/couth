{{> label}}
<div class='controls'>
  <select ng-model='{{path}}' class='input-xxlarge' id='{{id}}'{{#if required}} required{{/if}}>
    {{#each values}}
      <option>{{this}}</option>
    {{/each}}
  </select>
</div>
