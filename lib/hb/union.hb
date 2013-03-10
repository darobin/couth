<div class='union'>
  {{#each fields}}
    <fieldset>
      <input type='radio' name='{{id}}.union' id='{{id}}' required>
      {{> dispatch}}
    </fieldset>
  {{/each}}
</div>
