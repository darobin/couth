{{> label}}
<div class='controls'>
  <select ng-model='{{path}}' id='{{id}}'{{#if required}} required{{/if}}>
    {{#each values}}
      <option>{{this}}</option>
    {{/each}}
  </select>
</div>
