{{> label}}
<div class='controls'>
  <input type='radio' value='true'  ng-model='{{path}}' id='{{id}}.true'{{#if required}} required{{/if}}> on
  <input type='radio' value='false' ng-model='{{path}}' id='{{if}}.false'{{#if required}} required{{/if}}> off
</div>
