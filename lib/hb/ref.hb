{{> label}}
<div class='controls'>
  <input type='text' ng-show='false' ng-model='{{path}}' id='{{id}}'>
  <button type='button' couth-ref data-target-id='{{id}}' data-source='{{source}}'
          data-show='{{show}}' data-value='{{value}}' data-default='{{default}}'>Pick</button>
  <span ng-bind='{{path}}'></span>
</div>
