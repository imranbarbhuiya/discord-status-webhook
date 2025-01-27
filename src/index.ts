import 'dotenv/config';
import process from 'node:process';
import { setInterval } from 'node:timers';

import { EmbedBuilder, WebhookClient } from 'discord.js';
import Keyv from 'keyv';
import { fetch } from 'undici';

import {
	API_BASE,
	EMBED_COLOR_BLACK,
	EMBED_COLOR_GREEN,
	EMBED_COLOR_ORANGE,
	EMBED_COLOR_RED,
	EMBED_COLOR_YELLOW,
} from './constants.js';

import type { StatusPageIncident, StatusPageResult } from './interfaces/StatusPage';

interface DataEntry {
	incidentID: string;
	lastUpdate: string;
	messageID: string;
	resolved: boolean;
}

const incidentData = new Keyv<DataEntry>(`sqlite://data.sqlite`);

const hook = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL! });
console.info(`Starting with ${hook.id}`);

function embedFromIncident(incident: StatusPageIncident) {
	const color =
		incident.status === 'resolved' || incident.status === 'postmortem'
			? EMBED_COLOR_GREEN
			: incident.impact === 'critical'
				? EMBED_COLOR_RED
				: incident.impact === 'major'
					? EMBED_COLOR_ORANGE
					: incident.impact === 'minor'
						? EMBED_COLOR_YELLOW
						: EMBED_COLOR_BLACK;

	const affectedNames = incident.components.map((component) => component.name);

	const embed = new EmbedBuilder()
		.setColor(color)
		.setTimestamp(new Date(incident.started_at))
		.setURL(incident.shortlink)
		.setTitle(incident.name)
		.setFooter({ text: incident.id });

	for (const update of incident.incident_updates.reverse()) {
		const updateDT = new Date(update.created_at);
		const timeString = `<t:${Math.floor(updateDT.getTime() / 1_000)}:R>`;
		embed.addFields({
			name: `${update.status.charAt(0).toUpperCase()}${update.status.slice(1)} (${timeString})`,
			value: update.body,
		});
	}

	const descriptionParts = [`• Impact: ${incident.impact}`];

	if (affectedNames.length) {
		descriptionParts.push(`• Affected Components: ${affectedNames.join(', ')}`);
	}

	embed.setDescription(descriptionParts.join('\n'));

	return embed;
}

function isResolvedStatus(status: string) {
	return ['resolved', 'postmortem'].includes(status);
}

async function updateIncident(incident: StatusPageIncident, messageID?: string) {
	const embed = embedFromIncident(incident);
	try {
		const message = await (messageID
			? hook.editMessage(messageID, { embeds: [embed], threadId: process.env.THREAD_ID })
			: hook.send({ embeds: [embed], threadId: process.env.THREAD_ID, username: 'D-API Status' }));
		console.debug(`setting: ${incident.id} to message: ${message.id}`);
		await incidentData.set(incident.id, {
			incidentID: incident.id,
			lastUpdate: new Date().toISOString(),
			messageID: message.id,
			resolved: isResolvedStatus(incident.status),
		});
	} catch (error) {
		if (messageID) {
			console.error(`error during hook update on incident ${incident.id} message: ${messageID}\n`, error);
			return;
		}

		console.error(`error during hook sending on incident ${incident.id}\n`, error);
	}
}

async function check() {
	console.info('heartbeat');

	try {
		const json = (await fetch(`${API_BASE}/incidents.json`).then((res) => res.json())) as StatusPageResult;
		const { incidents } = json;

		const filteredIncidents = incidents.filter((incident) => {
			const lastUpdate = new Date(incident.incident_updates[0].created_at);
			return lastUpdate.getTime() > Date.now() - 1_000 * 60 * 60 * 24 * 5;
		});

		console.info(`found ${filteredIncidents.length} new incidents`);

		for (const incident of filteredIncidents.reverse()) {
			const data = await incidentData.get(incident.id);
			if (!data) {
				if (isResolvedStatus(incident.status)) {
					continue;
				}

				console.info(`new incident: ${incident.id}`);
				void updateIncident(incident);
				continue;
			}

			const incidentUpdate = new Date(incident.updated_at ?? incident.created_at);
			if (new Date(data.lastUpdate) < incidentUpdate) {
				console.info(`update incident: ${incident.id}`);
				void updateIncident(incident, data.messageID);
			}
		}
	} catch (error) {
		console.error(`error during fetch and update routine:\n`, error);
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void check();
setInterval(() => void check(), 60_000 * 5);
