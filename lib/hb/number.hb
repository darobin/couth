{{> label}}
<div class='controls'>
  <input type='number' ng-model='{{path}}' class='input-xxlarge' id='{{id}}'{{#if required}} required{{/if
         }}{{#if min}} min='{{min}}'{{/if}}{{#if max}} max='{{max}}'{{/if}}>
</div>
