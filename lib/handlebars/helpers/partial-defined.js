import { Exception } from '@handlebars/parser';

export default function (instance) {
  instance.registerHelper('partialDefined', function (name, options) {
    if (arguments.length != 2) {
      throw new Exception('partialDefined requires exactly one argument');
    }
    let partials = options.partials || {};
    return !!partials[name];
  });
}
