/**
 * react-native-web extras used by the browser build. `dataSet` renders as
 * `data-*` attributes on the DOM node (used for CSS-only hover states, see
 * public/index.html); React Native on phones ignores the prop.
 */

import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    dataSet?: Record<string, string>;
  }
  interface PressableProps {
    dataSet?: Record<string, string>;
  }
}
