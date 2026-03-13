import React from 'react';
import { View, ViewStyle, StyleProp, UIManager, Platform } from 'react-native';

/**
 * A safe wrapper around expo-linear-gradient that falls back to a plain View
 * when the native module (ExpoLinearGradient) is not registered in the current build.
 */

function isNativeViewAvailable(viewName: string): boolean {
    try {
        if (Platform.OS === 'android') {
            return UIManager.getViewManagerConfig(viewName) != null;
        }
        return UIManager.getViewManagerConfig(viewName) != null;
    } catch {
        return false;
    }
}

const hasNativeGradient = isNativeViewAvailable('ExpoLinearGradient');

let RealLinearGradient: React.ComponentType<any> | null = null;
if (hasNativeGradient) {
    try {
        const mod = require('expo-linear-gradient');
        RealLinearGradient = mod.LinearGradient;
    } catch {
        // Fallback
    }
}

interface SafeLinearGradientProps {
    colors: [string, string, ...string[]];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}

export default function SafeLinearGradient({
    colors,
    start,
    end,
    style,
    children,
}: SafeLinearGradientProps) {
    if (RealLinearGradient && hasNativeGradient) {
        return (
            <RealLinearGradient colors={colors} start={start} end={end} style={style}>
                {children}
            </RealLinearGradient>
        );
    }

    // Fallback: use the first color as a solid background
    return (
        <View style={[style, { backgroundColor: colors[0] || '#f425af' }]}>
            {children}
        </View>
    );
}
