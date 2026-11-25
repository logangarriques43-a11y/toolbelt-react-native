/**
 * Width of the area a screen is drawn in.
 *
 * On phones that is the window. In the browser it can be narrower: the
 * desktop layout puts a sidebar beside the screens, and mid-size windows show
 * the app in a centered column. The web layout components measure that area
 * and provide it here, so grids that size themselves from the width (the
 * calendar day columns, photo tiles) fit the area instead of the window.
 * Nothing provides it on iOS / Android, so the hook returns the window width
 * there, exactly as before.
 */

import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

export const ContentWidthContext = createContext<number | null>(null);

export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return useContext(ContentWidthContext) ?? width;
}
