import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup
import datetime

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": None
}

def parse_xml_feed(xml_content):
    # Parse the Atom XML feed
    try:
        # Register namespace to handle it properly
        ET.register_namespace('', 'http://www.w3.org/2005/Atom')
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

    # Namespace dictionary for XPath
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    # Atom feeds contain <entry> elements
    for entry_el in root.findall('atom:entry', ns):
        title_el = entry_el.find('atom:title', ns)
        date_str = title_el.text.strip() if title_el is not None else "Unknown Date"
        
        updated_el = entry_el.find('atom:updated', ns)
        updated_str = updated_el.text.strip() if updated_el is not None else ""
        
        link_el = entry_el.find("atom:link[@rel='alternate']", ns)
        link_url = ""
        if link_el is not None:
            link_url = link_el.attrib.get('href', '')
        else:
            # Try finding any link
            link_el = entry_el.find('atom:link', ns)
            if link_el is not None:
                link_url = link_el.attrib.get('href', '')
                
        content_el = entry_el.find('atom:content', ns)
        if content_el is None or content_el.text is None:
            continue
            
        content_html = content_el.text
        
        # Parse html content
        soup = BeautifulSoup(content_html, 'html.parser')
        h3_tags = soup.find_all('h3')
        
        if not h3_tags:
            # General entry without explicit h3 categorization
            text_content = " ".join(soup.get_text().split())
            entries.append({
                'date': date_str,
                'updated': updated_str,
                'type': 'General',
                'description': content_html,
                'text_content': text_content,
                'link': link_url
            })
            continue
            
        for h3 in h3_tags:
            update_type = h3.get_text().strip()
            
            # Find siblings until the next h3 tag
            siblings = []
            next_sib = h3.next_sibling
            while next_sib and getattr(next_sib, 'name', None) != 'h3':
                siblings.append(str(next_sib))
                next_sib = next_sib.next_sibling
                
            description_html = "".join(siblings).strip()
            
            desc_soup = BeautifulSoup(description_html, 'html.parser')
            text_content = " ".join(desc_soup.get_text().split())
            
            entries.append({
                'date': date_str,
                'updated': updated_str,
                'type': update_type,
                'description': description_html,
                'text_content': text_content,
                'link': link_url
            })
            
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Use cached data if available and not older than 1 hour, unless forced refresh
    now = datetime.datetime.now()
    if not force_refresh and cache["data"] and cache["last_fetched"]:
        if (now - cache["last_fetched"]).total_seconds() < 3600:
            return jsonify({
                "source": "cache",
                "last_fetched": cache["last_fetched"].isoformat(),
                "notes": cache["data"]
            })
            
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        notes = parse_xml_feed(response.text)
        
        # Update cache
        cache["data"] = notes
        cache["last_fetched"] = now
        
        return jsonify({
            "source": "live",
            "last_fetched": now.isoformat(),
            "notes": notes
        })
    except Exception as e:
        print(f"Error fetching live feed: {e}")
        # If live fetch fails, fallback to cache if available
        if cache["data"]:
            return jsonify({
                "source": "cache_fallback",
                "last_fetched": cache["last_fetched"].isoformat() if cache["last_fetched"] else None,
                "notes": cache["data"],
                "error": str(e)
            })
        return jsonify({
            "error": "Failed to fetch release notes and no cached data available.",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
