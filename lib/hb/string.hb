{{> label}}
<div class='controls'>
  <input type='text' ng-model='{{path}}' id='{{id}}'{{#if required}} required{{/if
         }}{{#if pattern}} pattern='{{pattern}}'{{/if}}{{#if maxLength}} maxlength='{{maxLength}}'{{/if}}>
</div>
