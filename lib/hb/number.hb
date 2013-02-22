{{> label}}
<div class='controls'>
  <input type='number' ng-model='{{path}}' id='{{id}}'{{#if required}} required{{/if
         }}{{#if min}} min='{{min}}'{{/if}}{{#if max}} max='{{max}}'{{/if}}>
</div>
