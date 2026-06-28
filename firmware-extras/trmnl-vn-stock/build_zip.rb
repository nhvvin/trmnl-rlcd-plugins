#!/usr/bin/env ruby
# frozen_string_literal: true

# Convert TRMNL-store-format plugin (settings.yml + full.liquid)
# to Terminus-native local-import format (configuration.yml + template.html.liquid),
# then ZIP and (optionally) upload to a Terminus instance.
#
# Usage:
#   ruby firmware-extras/trmnl-vn-stock/build_zip.rb                # build ZIP only
#   ruby firmware-extras/trmnl-vn-stock/build_zip.rb upload <HOST>  # build + curl upload
#
# Example:
#   ruby firmware-extras/trmnl-vn-stock/build_zip.rb upload 45.76.179.84:2300

require "yaml"
require "zip"        # gem install rubyzip (only if not installed)
require "fileutils"
require "time"

ROOT     = File.expand_path(__dir__)
SRC_YML  = File.join(ROOT, "liquid", "settings.yml")
SRC_LIQ  = File.join(ROOT, "liquid", "full.liquid")
OUT_DIR  = File.join(ROOT, "dist")
OUT_ZIP  = File.join(OUT_DIR, "vn-stock-dashboard.zip")

abort "Missing #{SRC_YML}" unless File.exist?(SRC_YML)
abort "Missing #{SRC_LIQ}" unless File.exist?(SRC_LIQ)

trmnl    = YAML.safe_load(File.read(SRC_YML), permitted_classes: [Symbol, Time], aliases: true)
template = File.read(SRC_LIQ)

# Map TRMNL → Terminus.
# settings.yml schema (TRMNL store)   →   configuration.yml schema (Terminus local import)
#   strategy: polling                       kind: poll
#   refresh_interval: 30                    interval: 30,  unit: minute
#   polling_url (string, newline-sep)       exchanges[0].template (same string)
#   polling_verb: get                       exchanges[0].verb: GET
#   polling_headers: ''                     exchanges[0].headers: {}
#   polling_body: ''                        exchanges[0].body: {}
#   custom_fields: [{keyname, name, ...}]   fields: [same array, untouched]
#   name: "VN Stock Dashboard"              label: "VN Stock Dashboard"
#                                           name: "vn_stock_dashboard" (snake_case)
#                                           mode: html
#                                           version: latest
#                                           start_at: <today RFC3339>
#                                           description / static_body / data / tags / days / last_day_of_month

label = trmnl.fetch("name", "VN Stock Dashboard")
name  = label.downcase.gsub(/[^a-z0-9]+/, "_").gsub(/^_+|_+$/, "")

headers_str = trmnl["polling_headers"].to_s.strip
headers     = headers_str.empty? ? {} : YAML.safe_load(headers_str)
body_str    = trmnl["polling_body"].to_s.strip
body        = body_str.empty? ? {} : YAML.safe_load(body_str)

# Terminus Types::Version regex: /\A\d+\.\d+\.\d+\Z/  → must be strict semver (e.g. 1.0.0).
PLUGIN_VERSION = "1.0.0"

# Terminus mode enum: "text" (1-bit BMP) | "dither" (24-bit BMP).
# Waveshare ESP32-S3-RLCD-4.2 (ST7305) is monochrome → must be "text".
# Using "dither" produces a 24-bit BMP that the firmware rejects.
PLUGIN_MODE = "text"

config = {
  "version"           => PLUGIN_VERSION,
  "name"              => name,
  "label"             => label,
  "description"       => "VN stocks dashboard: VN-Index + 8 blue chips + VN30. Data: SSI iBoard (free, no API key).",
  "mode"              => PLUGIN_MODE,
  "kind"              => "poll",
  "tags"              => ["finance", "vietnam"],
  "static_body"       => {},
  "fields"            => Array(trmnl["custom_fields"]),
  "data"              => {},
  "interval"          => Integer(trmnl.fetch("refresh_interval", 30)),
  "unit"              => "minute",
  "days"              => [],
  "last_day_of_month" => false,
  "start_at"          => Time.now.utc.iso8601,
  "exchanges"         => [
    {
      "headers"  => headers,
      "verb"     => (trmnl.fetch("polling_verb", "get").to_s.upcase),
      "template" => trmnl.fetch("polling_url").to_s,
      "body"     => body
    }
  ]
}

# Build ZIP (flat, only 2 entries).
FileUtils.mkdir_p OUT_DIR
File.delete(OUT_ZIP) if File.exist?(OUT_ZIP)

Zip::File.open(OUT_ZIP, Zip::File::CREATE) do |zip|
  zip.get_output_stream("configuration.yml")    { |io| io.write YAML.dump(config) }
  zip.get_output_stream("template.html.liquid") { |io| io.write template }
end

puts "✔ Built #{OUT_ZIP} (#{File.size(OUT_ZIP)} bytes)"
puts "  Contents:"
Zip::File.open(OUT_ZIP) { |z| z.each { |e| puts "    #{e.name}  #{e.size}B" } }
puts
puts "Local configuration.yml preview:"
puts YAML.dump(config).lines.first(25).join

if ARGV[0] == "upload"
  host = ARGV[1] || abort("Usage: build_zip.rb upload <HOST:PORT>")
  url  = "http://#{host}/extensions/import"
  puts
  puts "→ Uploading to #{url} ..."
  out = `curl -sS -i -F extension_attachment=@#{OUT_ZIP} #{url} 2>&1`
  puts out.lines.first(20).join
end
