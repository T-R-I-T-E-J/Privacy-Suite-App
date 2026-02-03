import { faker } from '@faker-js/faker';

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'generate') {
        const { schema, rows } = payload;
        const chunkSize = 1000; // Generate 1000 rows at a time

        try {
            for (let i = 0; i < rows; i += chunkSize) {
                const currentChunkSize = Math.min(chunkSize, rows - i);
                const chunkData = [];

                for (let j = 0; j < currentChunkSize; j++) {
                    const row: any = {};
                    schema.forEach((col: any) => {
                        row[col.name] = generateFakeValue(col.type);
                    });
                    chunkData.push(row);
                }

                self.postMessage({
                    type: 'chunk',
                    payload: {
                        data: chunkData,
                        progress: i + currentChunkSize,
                        total: rows
                    }
                });
            }

            self.postMessage({ type: 'complete' });

        } catch (err: any) {
            self.postMessage({ type: 'error', payload: err.message });
        }
    }
};

function generateFakeValue(type: string): string | number {
    switch (type) {
        case 'name': return faker.person.fullName();
        case 'email': return faker.internet.email();
        case 'phone': return faker.phone.number();
        case 'address': return faker.location.streetAddress();
        case 'city': return faker.location.city();
        case 'country': return faker.location.country();
        case 'company': return faker.company.name();
        case 'date': return faker.date.past().toISOString().split('T')[0];
        case 'uuid': return faker.string.uuid();
        case 'boolean': return faker.datatype.boolean() ? 'true' : 'false';
        case 'number': return faker.number.int({ min: 1, max: 1000 });
        case 'credit_card': return faker.finance.creditCardNumber();
        default: return faker.lorem.word();
    }
}
