import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface GlassesDisplayMirrorProps {
  layout: any;
  fallbackMessage?: string;
  containerStyle?: any;
}

const GlassesDisplayMirror: React.FC<GlassesDisplayMirrorProps> = ({ 
  layout, 
  fallbackMessage = "No display data available", 
  containerStyle 
}) => {
  // Determine if we're in the simulated view
  const inSimulatedView = isInSimulatedView(containerStyle);
  
  return (
    <View style={[
      styles.glassesDisplayContainer, 
      containerStyle,
      inSimulatedView && { padding: 0 }
    ]}>
      <View style={[
        styles.glassesScreen,
        inSimulatedView && { 
          borderRadius: 0,
          borderBottomWidth: 0,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          height: '100%',
          minHeight: 120 // Lower height for simulated view
        }
      ]}>
        {layout && layout.layoutType ? (
          renderLayout(layout, containerStyle)
        ) : (
          <Text style={[
            styles.glassesText,
            inSimulatedView && { fontSize: 14 }
          ]}>
            {fallbackMessage}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Render logic for each layoutType
 */
function renderLayout(layout: any, containerStyle?: any) {
  // Use smaller text when in the simulated view in ConnectedDeviceInfo
  const textStyle = [
    styles.glassesText,
    isInSimulatedView(containerStyle) && { fontSize: 14 }
  ];

  switch (layout.layoutType) {
    case 'reference_card': {
      const { title, text } = layout;
      return (
        <>
          <Text style={[styles.cardTitle, textStyle]}>{title}</Text>
          <Text style={[styles.cardContent, textStyle]}>{text}</Text>
        </>
      );
    }
    case 'text_wall':
    case 'text_line': {
      const { text } = layout;
      // Even if text is empty, show a placeholder message for text_wall layouts
      return (
        <Text style={[styles.cardContent, textStyle]}>
          {text || text === "" ? text : ""}
        </Text>
      );
    }
    case 'double_text_wall': {
      const { topText, bottomText } = layout;
      return (
        <>
          <Text style={[styles.cardContent, textStyle]}>{topText}</Text>
          <Text style={[styles.cardContent, textStyle]}>{bottomText}</Text>
        </>
      );
    }
    case 'text_rows': {
      // layout.text is presumably an array of strings
      const rows = layout.text || [];
      return rows.map((row: string, index: number) => (
        <Text key={index} style={[styles.cardContent, textStyle]}>
          {row}
        </Text>
      ));
    }
    case 'bitmap_view': {
      // layout.data is a base64 string. We can show an image in RN by creating a data URL
      // e.g. { uri: "data:image/png;base64,<base64string>" }
      const { data } = layout;
      const imageUri = `data:image/png;base64,${data}`;
      return (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 200, height: 200, resizeMode: 'contain', tintColor: '#00FF00' }}
        />
      );
    }
    default:
      return (
        <Text style={[styles.cardContent, textStyle]}>
          Unknown layout type: {layout.layoutType}
        </Text>
      );
  }
}

// Add special styling for when displayed in the ConnectedSimulatedGlassesInfo component
const isInSimulatedView = (containerStyle: any) => {
  // Detect when this is being used in the ConnectedSimulatedGlassesInfo component
  return containerStyle && 
         (containerStyle.padding === 0 || 
          (typeof containerStyle.height === 'string' && containerStyle.height === '100%'));
};

const styles = StyleSheet.create({
  glassesDisplayContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  glassesScreen: {
    width: '100%',
    minHeight: 200, // Default height for normal mode
    backgroundColor: '#000000',
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: '#333333',
  },
  glassesText: {
    color: '#00FF00', // Bright green color for monochrome display
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    // Add text shadow for better visibility against any background
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emptyTextWall: {
    borderWidth: 1,
    borderColor: '#00FF00',
    borderStyle: 'dashed',
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 5,
  },
  cardContent: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
});

export default GlassesDisplayMirror;