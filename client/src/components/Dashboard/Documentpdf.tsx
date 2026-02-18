import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica'
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#666'
  },
  paragraph: {
    marginBottom: 10
  }
});

interface DocumentPDFProps {
  title: string;
  content: string;
}

const DocumentPDF: React.FC<DocumentPDFProps> = ({ title, content }) => {
  // Remove HTML tags from content (simple version)
  const plainText = content.replace(/<[^>]*>/g, '');
  // Split into paragraphs
  const paragraphs = plainText.split('\n').filter(p => p.trim());
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.content}>
          {paragraphs.map((para, index) => (
            <Text key={index} style={styles.paragraph}>{para}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default DocumentPDF;