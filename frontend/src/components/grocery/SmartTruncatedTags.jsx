import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const SmartTruncatedTags = ({ tags }) => {
  const [truncatedTags, setTruncatedTags] = useState(tags);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemNameWidth, setItemNameWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Get the item name width from the previous sibling (the item name div)
    const itemNameElement = containerRef.current.previousElementSibling;
    if (itemNameElement) {
      setItemNameWidth(itemNameElement.offsetWidth + 8); // Add just 8px buffer after item name
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!containerWidth) return;

    const measureText = (text, isTag = false) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = isTag ? '12px sans-serif' : '16px sans-serif';
      const metrics = context.measureText(text);
      // Add minimal padding for tags (12px for padding + 4px for gap)
      return isTag ? metrics.width + 16 : metrics.width;
    };

    const availableWidth = containerWidth - itemNameWidth; // No extra buffer needed
    let currentTags = [...tags];
    let totalWidth = currentTags.reduce((sum, tag) => sum + measureText(tag.text, true), 0);

    // Only truncate if we actually need to
    if (totalWidth > availableWidth && availableWidth > 0) {
      // First, try to reduce longer tags until they match shorter ones
      while (totalWidth > availableWidth) {
        // Find the length of the shortest and longest tags
        const lengths = currentTags.map(tag => tag.text.length);
        const maxLength = Math.max(...lengths);
        const minLength = Math.min(...lengths);

        if (maxLength <= 1) break; // Can't truncate further

        if (maxLength > minLength) {
          // Find all tags with the maximum length
          const longestTags = currentTags.filter(tag => tag.text.length === maxLength);
          
          // Truncate each of the longest tags by one character
          for (const tag of longestTags) {
            const oldWidth = measureText(tag.text, true);
            const tagIndex = currentTags.findIndex(t => t === tag);
            currentTags[tagIndex] = {
              ...tag,
              text: tag.text.slice(0, -1)
            };
            const newWidth = measureText(currentTags[tagIndex].text, true);
            totalWidth -= (oldWidth - newWidth);
            
            // If we've made enough space, break out
            if (totalWidth <= availableWidth) break;
          }
        } else {
          // All tags are the same length, truncate all of them evenly
          const oldTotal = totalWidth;
          currentTags = currentTags.map(tag => ({
            ...tag,
            text: tag.text.length > 1 ? tag.text.slice(0, -1) : tag.text
          }));
          totalWidth = currentTags.reduce((sum, tag) => sum + measureText(tag.text, true), 0);
          
          // If we can't reduce further, break
          if (totalWidth === oldTotal) break;
        }
      }
    }

    setTruncatedTags(currentTags);
  }, [tags, containerWidth, itemNameWidth]);

  return (
    <div ref={containerRef} className="flex items-center justify-end gap-1 min-w-0 flex-wrap">
      {truncatedTags.map((tag, index) => (
        <span
          key={`${tag.text}-${index}`}
          className={`inline-flex items-center text-xs px-2 py-1 bg-${tag.color}-100 dark:bg-${tag.color}-900 text-${tag.color}-800 dark:text-${tag.color}-200 rounded-full whitespace-nowrap`}
        >
          {tag.text}
        </span>
      ))}
    </div>
  );
};

SmartTruncatedTags.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  })).isRequired
};

export default SmartTruncatedTags; 